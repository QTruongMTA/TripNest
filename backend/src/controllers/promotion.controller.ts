import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateVoucher } from "../utils/voucher.utils";

export const promotionController = {
  async validatePropertyVoucher(req: Request, res: Response) {
    const propertyId = String(req.body?.propertyId ?? "");
    const code = String(req.body?.code ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const orderValue = Number(req.body?.orderValue);
    const guests = Number(req.body?.guests);

    if (!propertyId || !code || !Number.isFinite(orderValue) || orderValue <= 0 || !Number.isFinite(guests)) {
      return res.status(400).json({
        error: {
          code: "INVALID_VOUCHER_PAYLOAD",
          message: "Vui lòng nhập mã voucher hợp lệ.",
        },
      });
    }

    const promotion = await prisma.promotion.findUnique({ where: { code } });
    if (!promotion) {
      return res.status(404).json({
        error: {
          code: "VOUCHER_NOT_FOUND",
          message: "Không tìm thấy mã voucher.",
        },
      });
    }

    const result = validateVoucher(promotion, { propertyId, code, orderValue, guests });
    if (!result.valid) {
      return res.status(400).json({
        error: {
          code: "VOUCHER_NOT_APPLICABLE",
          message: result.message,
        },
      });
    }

    return res.json({
      data: {
        code,
        discountAmount: result.discountAmount,
        finalAmount: result.finalAmount,
      },
    });
  },
};

