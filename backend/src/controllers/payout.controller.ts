import type { Request, Response } from "express";
import { payoutService } from "../services/payout.service";

export const payoutController = {
  async listHostPayouts(req: Request, res: Response) {
    const payouts = await payoutService.listForHost(req.user!.id);
    return res.json({ data: payouts });
  },

  async adminListPayouts(req: Request, res: Response) {
    const q = req.query as Record<string, string | undefined>;
    const filters: { hostId?: string; status?: string; month?: string } = {};
    if (q.hostId) filters.hostId = q.hostId;
    if (q.status) filters.status = q.status;
    if (q.month) filters.month = q.month;
    const payouts = await payoutService.listForAdmin(filters);
    return res.json({ data: payouts });
  },

  async adminAdjustPayout(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const { adjustmentAmount, adjustmentReason, allowPaid } = req.body ?? {};

    if (typeof adjustmentAmount !== "number" || !Number.isFinite(adjustmentAmount)) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "adjustmentAmount phải là số." } });
    }
    if (typeof adjustmentReason !== "string" || !adjustmentReason.trim()) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "adjustmentReason không được rỗng." } });
    }

    const result = await payoutService.adjustPayout(id, adjustmentAmount, adjustmentReason.trim(), allowPaid === true);
    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy payout." } });
    }
    if (result.kind === "PAYOUT_ALREADY_PAID") {
      return res.status(409).json({ error: { code: "PAYOUT_ALREADY_PAID", message: "Payout đã PAID. Truyền allowPaid=true để xác nhận điều chỉnh." } });
    }
    return res.json({ data: result.data });
  },

  async adminConfirmPayout(req: Request, res: Response) {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const result = await payoutService.confirmPaid(id);
    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy payout." } });
    }
    if (result.kind === "ALREADY_PAID") {
      return res.status(409).json({ error: { code: "ALREADY_PAID", message: "Payout đã được thanh toán." } });
    }
    if (result.kind === "NOT_READY") {
      return res.status(422).json({ error: { code: "NOT_READY", message: "Payout chưa sẵn sàng (tháng hiện tại)." } });
    }
    return res.json({ data: result.data });
  },
};
