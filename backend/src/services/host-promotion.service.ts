import { DiscountType } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

type PromotionInput = {
  code: string;
  propertyId: string | null;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  startDate: Date;
  endDate: Date;
  isActive?: boolean | undefined;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function serializePromotion(p: {
  id: string;
  code: string;
  hostId: string | null;
  propertyId: string | null;
  description: string | null;
  discountType: DiscountType;
  discountValue: { toNumber(): number };
  minOrderValue: { toNumber(): number } | null;
  maxUses: number | null;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  property?: { id: string; title: string; city: string } | null;
}) {
  const now = new Date();
  const exhausted = p.maxUses !== null && p.usedCount >= p.maxUses;
  const effectiveStatus = !p.isActive
    ? "PAUSED"
    : exhausted
      ? "EXHAUSTED"
      : p.endDate < now
        ? "ENDED"
        : p.startDate > now
          ? "SCHEDULED"
          : "ACTIVE";

  return {
    id: p.id,
    code: p.code,
    hostId: p.hostId,
    propertyId: p.propertyId,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue.toNumber(),
    minOrderValue: p.minOrderValue?.toNumber() ?? null,
    maxUses: p.maxUses,
    usedCount: p.usedCount,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate.toISOString().slice(0, 10),
    isActive: p.isActive,
    effectiveStatus,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    property: p.property ?? null,
  };
}

async function assertPropertyBelongsToHost(hostId: string, propertyId: string | null) {
  if (!propertyId) return true;
  const property = await prisma.property.findFirst({
    where: { id: propertyId, hostId },
    select: { id: true },
  });
  return Boolean(property);
}

function validateInput(input: PromotionInput) {
  const code = normalizeCode(input.code);
  if (code.length < 3 || code.length > 24 || !/^[A-Z0-9_-]+$/.test(code)) return { kind: "INVALID_CODE" as const };
  if (![DiscountType.PERCENTAGE, DiscountType.FIXED_AMOUNT].includes(input.discountType)) return { kind: "INVALID_DISCOUNT" as const };
  if (input.discountType === DiscountType.PERCENTAGE && (input.discountValue <= 0 || input.discountValue > 80)) return { kind: "INVALID_DISCOUNT" as const };
  if (input.discountType === DiscountType.FIXED_AMOUNT && input.discountValue <= 0) return { kind: "INVALID_DISCOUNT" as const };
  if (input.minOrderValue !== null && input.minOrderValue < 0) return { kind: "INVALID_MIN_ORDER" as const };
  if (input.maxUses !== null && input.maxUses < 1) return { kind: "INVALID_MAX_USES" as const };
  if (Number.isNaN(input.startDate.getTime()) || Number.isNaN(input.endDate.getTime()) || input.endDate <= input.startDate) return { kind: "INVALID_DATES" as const };
  return { kind: "VALID" as const, code };
}

export const hostPromotionService = {
  async list(hostId: string) {
    const promotions = await prisma.promotion.findMany({
      where: { hostId },
      orderBy: { createdAt: "desc" },
      include: { property: { select: { id: true, title: true, city: true } } },
    });
    return promotions.map(serializePromotion);
  },

  async create(hostId: string, input: PromotionInput) {
    const validation = validateInput(input);
    if (validation.kind !== "VALID") return validation;
    if (!(await assertPropertyBelongsToHost(hostId, input.propertyId))) return { kind: "PROPERTY_NOT_FOUND" as const };

    try {
      const promotion = await prisma.promotion.create({
        data: {
          hostId,
          propertyId: input.propertyId,
          code: validation.code,
          description: input.description?.trim() || null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          minOrderValue: input.minOrderValue,
          maxUses: input.maxUses,
          startDate: input.startDate,
          endDate: input.endDate,
          isActive: input.isActive ?? true,
        },
        include: { property: { select: { id: true, title: true, city: true } } },
      });
      return { kind: "SUCCESS" as const, data: serializePromotion(promotion) };
    } catch {
      return { kind: "CODE_EXISTS" as const };
    }
  },

  async update(hostId: string, promotionId: string, input: Partial<PromotionInput>) {
    const existing = await prisma.promotion.findFirst({ where: { id: promotionId, hostId }, select: { id: true, usedCount: true } });
    if (!existing) return { kind: "NOT_FOUND" as const };
    if (input.propertyId !== undefined && !(await assertPropertyBelongsToHost(hostId, input.propertyId))) return { kind: "PROPERTY_NOT_FOUND" as const };

    const data: Record<string, unknown> = {};
    if (input.code !== undefined) {
      const code = normalizeCode(input.code);
      if (code.length < 3 || code.length > 24 || !/^[A-Z0-9_-]+$/.test(code)) return { kind: "INVALID_CODE" as const };
      data.code = code;
    }
    if (input.propertyId !== undefined) data.propertyId = input.propertyId;
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.discountType !== undefined) data.discountType = input.discountType;
    if (input.discountValue !== undefined) data.discountValue = input.discountValue;
    if (input.minOrderValue !== undefined) data.minOrderValue = input.minOrderValue;
    if (input.maxUses !== undefined) {
      if (input.maxUses !== null && input.maxUses < existing.usedCount) return { kind: "MAX_USES_BELOW_USED" as const };
      data.maxUses = input.maxUses;
    }
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.endDate !== undefined) data.endDate = input.endDate;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      const promotion = await prisma.promotion.update({
        where: { id: promotionId },
        data,
        include: { property: { select: { id: true, title: true, city: true } } },
      });
      return { kind: "SUCCESS" as const, data: serializePromotion(promotion) };
    } catch {
      return { kind: "CODE_EXISTS" as const };
    }
  },

  async toggle(hostId: string, promotionId: string, isActive: boolean) {
    const promotion = await prisma.promotion.findFirst({ where: { id: promotionId, hostId }, select: { id: true } });
    if (!promotion) return { kind: "NOT_FOUND" as const };
    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: { isActive },
      include: { property: { select: { id: true, title: true, city: true } } },
    });
    return { kind: "SUCCESS" as const, data: serializePromotion(updated) };
  },

  async remove(hostId: string, promotionId: string) {
    const promotion = await prisma.promotion.findFirst({ where: { id: promotionId, hostId }, select: { id: true, usedCount: true } });
    if (!promotion) return { kind: "NOT_FOUND" as const };
    if (promotion.usedCount > 0) return { kind: "PROMOTION_USED" as const };
    await prisma.promotion.delete({ where: { id: promotionId } });
    return { kind: "SUCCESS" as const };
  },
};
