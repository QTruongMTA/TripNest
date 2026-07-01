import type { Request, Response } from "express";
import { DiscountType } from "../generated/prisma/enums";
import { hostPromotionService } from "../services/host-promotion.service";

function readDate(value: unknown) {
  return typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : new Date(NaN);
}

function readNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function readPayload(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const discountType = value.discountType === DiscountType.FIXED_AMOUNT ? DiscountType.FIXED_AMOUNT : DiscountType.PERCENTAGE;
  return {
    code: typeof value.code === "string" ? value.code : "",
    propertyId: typeof value.propertyId === "string" && value.propertyId ? value.propertyId : null,
    description: typeof value.description === "string" ? value.description : null,
    discountType,
    discountValue: Number(value.discountValue),
    minOrderValue: readNumber(value.minOrderValue),
    maxUses: readNumber(value.maxUses),
    startDate: readDate(value.startDate),
    endDate: readDate(value.endDate),
    isActive: value.isActive === undefined ? undefined : value.isActive === true,
  };
}

function respondError(res: Response, kind: string) {
  const map: Record<string, { status: number; message: string }> = {
    INVALID_CODE: { status: 400, message: "Mã ưu đãi cần 3-24 ký tự, chỉ gồm chữ, số, _ hoặc -." },
    INVALID_DISCOUNT: { status: 400, message: "Giá trị giảm giá không hợp lệ." },
    INVALID_MIN_ORDER: { status: 400, message: "Giá trị đơn tối thiểu không hợp lệ." },
    INVALID_MAX_USES: { status: 400, message: "Số lượt dùng tối đa không hợp lệ." },
    INVALID_DATES: { status: 400, message: "Ngày kết thúc phải sau ngày bắt đầu." },
    PROPERTY_NOT_FOUND: { status: 404, message: "Không tìm thấy chỗ nghỉ thuộc tài khoản host." },
    NOT_FOUND: { status: 404, message: "Không tìm thấy ưu đãi." },
    CODE_EXISTS: { status: 409, message: "Mã ưu đãi đã tồn tại." },
    MAX_USES_BELOW_USED: { status: 409, message: "Số lượt dùng tối đa không thể nhỏ hơn số lượt đã dùng." },
    PROMOTION_USED: { status: 409, message: "Ưu đãi đã có lượt dùng, chỉ có thể tạm tắt thay vì xóa." },
  };
  const cfg = map[kind] ?? { status: 400, message: "Không thể xử lý ưu đãi." };
  return res.status(cfg.status).json({ error: { code: kind, message: cfg.message } });
}

export const hostPromotionController = {
  async list(req: Request, res: Response) {
    const data = await hostPromotionService.list(req.user!.id);
    return res.json({ data });
  },

  async create(req: Request, res: Response) {
    const result = await hostPromotionService.create(req.user!.id, readPayload(req.body));
    if (result.kind !== "SUCCESS") return respondError(res, result.kind);
    return res.status(201).json({ data: result.data });
  },

  async update(req: Request, res: Response) {
    const payload = readPayload(req.body);
    const result = await hostPromotionService.update(req.user!.id, req.params.id as string, payload);
    if (result.kind !== "SUCCESS") return respondError(res, result.kind);
    return res.json({ data: result.data });
  },

  async toggle(req: Request, res: Response) {
    const result = await hostPromotionService.toggle(req.user!.id, req.params.id as string, req.body?.isActive === true);
    if (result.kind !== "SUCCESS") return respondError(res, result.kind);
    return res.json({ data: result.data });
  },

  async remove(req: Request, res: Response) {
    const result = await hostPromotionService.remove(req.user!.id, req.params.id as string);
    if (result.kind !== "SUCCESS") return respondError(res, result.kind);
    return res.status(204).send();
  },
};
