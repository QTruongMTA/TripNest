export type VoucherCondition = "MIN_ORDER_500K" | "MIN_GUESTS_5";

export type HostVoucherMetadata = {
  kind: "HOST_PROPERTY_VOUCHER";
  propertyId: string;
  voucherType: string;
  conditions: VoucherCondition[];
};

export type SystemVoucherMetadata = {
  kind: "SYSTEM_VOUCHER";
  voucherType: string;
  conditions: VoucherCondition[];
};

export type VoucherMetadata = HostVoucherMetadata | SystemVoucherMetadata;

export type VoucherValidationInput = {
  propertyId: string;
  code: string;
  orderValue: number;
  guests: number;
};

type PromotionLike = {
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: { toNumber(): number };
  minOrderValue: { toNumber(): number } | null;
  maxUses: number | null;
  usedCount: number;
  endDate: Date;
  isActive: boolean;
};

function parseConditions(value: unknown) {
  return Array.isArray(value)
    ? value.filter((condition): condition is VoucherCondition => condition === "MIN_ORDER_500K" || condition === "MIN_GUESTS_5")
    : [];
}

export function parseVoucherMetadata(description?: string | null): VoucherMetadata | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    const voucherType = typeof parsed.voucherType === "string" ? parsed.voucherType : "Khác";
    const conditions = parseConditions(parsed.conditions);

    if (parsed.kind === "SYSTEM_VOUCHER") {
      return { kind: "SYSTEM_VOUCHER", voucherType, conditions };
    }

    if (parsed.kind === "HOST_PROPERTY_VOUCHER" && typeof parsed.propertyId === "string") {
      return { kind: "HOST_PROPERTY_VOUCHER", propertyId: parsed.propertyId, voucherType, conditions };
    }

    return null;
  } catch {
    return null;
  }
}

export function validateVoucher(promotion: PromotionLike, input: VoucherValidationInput) {
  const metadata = parseVoucherMetadata(promotion.description);
  const now = new Date();

  if (!metadata) {
    return { valid: false as const, message: "Mã voucher không hợp lệ." };
  }

  if (metadata.kind === "HOST_PROPERTY_VOUCHER" && metadata.propertyId !== input.propertyId) {
    return { valid: false as const, message: "Mã voucher không áp dụng cho chỗ nghỉ này." };
  }

  if (!promotion.isActive || promotion.endDate < now) {
    return { valid: false as const, message: "Mã voucher đã hết hạn." };
  }

  if (promotion.maxUses !== null && promotion.usedCount >= promotion.maxUses) {
    return { valid: false as const, message: "Mã voucher đã hết số lượng sử dụng." };
  }

  if (metadata.conditions.includes("MIN_ORDER_500K") && input.orderValue < 500000) {
    return { valid: false as const, message: "Voucher yêu cầu giá trị hóa đơn từ 500.000 ₫ trở lên." };
  }

  if (metadata.conditions.includes("MIN_GUESTS_5") && input.guests < 5) {
    return { valid: false as const, message: "Voucher yêu cầu đặt phòng từ 5 người trở lên." };
  }

  const rawDiscount = promotion.discountType === "PERCENTAGE"
    ? Math.round(input.orderValue * (promotion.discountValue.toNumber() / 100))
    : Math.round(promotion.discountValue.toNumber());
  const discountAmount = Math.max(0, Math.min(input.orderValue, rawDiscount));

  return {
    valid: true as const,
    metadata,
    discountAmount,
    finalAmount: Math.max(0, input.orderValue - discountAmount),
  };
}
