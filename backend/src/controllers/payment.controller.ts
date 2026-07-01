import type { Request, Response } from "express";
import { paymentService } from "../services/payment.service";

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

const ERR_MESSAGES: Record<string, [number, string]> = {
  NOT_FOUND:      [404, "Không tìm thấy."],
  NO_PAYMENT:     [409, "Chưa có bản ghi thanh toán."],
  NOT_CONFIRMED:  [409, "Đơn đặt chưa được xác nhận."],
  INVALID_STATUS: [409, "Trạng thái thanh toán không hợp lệ để thực hiện thao tác này."],
};

function sendErr(res: Response, kind: string) {
  const [status, message] = ERR_MESSAGES[kind] ?? [500, "Lỗi hệ thống."];
  return res.status(status).json({ error: { code: kind, message } });
}

export const paymentController = {

  // PATCH /bookings/:id/payment/mark-transferred  (guest)
  async guestMarkTransferred(req: Request, res: Response) {
    const result = await paymentService.markTransferred(param(req, "id"), req.user!.id);
    if (result.kind !== "SUCCESS") return sendErr(res, result.kind);
    return res.json({ data: { success: true } });
  },

  // PATCH /host/bookings/:id/payment/confirm  (host)
  async hostConfirmPayment(req: Request, res: Response) {
    const result = await paymentService.confirmByHost(param(req, "id"), req.user!.id);
    if (result.kind !== "SUCCESS") return sendErr(res, result.kind);
    return res.json({ data: { paymentStatus: "PAID" } });
  },

  // PATCH /admin/payments/:id/confirm  (admin)
  async adminConfirmPayment(req: Request, res: Response) {
    const result = await paymentService.confirmByAdmin(param(req, "id"), req.user!.id);
    if (result.kind !== "SUCCESS") return sendErr(res, result.kind);
    return res.json({ data: { success: true } });
  },
};
