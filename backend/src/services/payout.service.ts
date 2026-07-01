import { PayoutStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

function formatVND(amount: number) {
  return `₫${amount.toLocaleString("vi-VN")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export type PayoutNumbers = {
  totalRevenue: number;
  commission: number;
  refundedAmount: number;
  netPayout: number;
};

export const payoutService = {
  // Upsert payout record for a month from computed numbers.
  // Frozen once PAID — only updates numbers for PENDING/READY.
  async sync(hostId: string, month: string, numbers: PayoutNumbers) {
    const isCurrent = month === currentMonth();
    const autoStatus = isCurrent ? PayoutStatus.PENDING : PayoutStatus.READY;

    const existing = await prisma.hostPayout.findUnique({
      where: { hostId_month: { hostId, month } },
    });

    if (existing?.status === PayoutStatus.PAID) return existing;

    return prisma.hostPayout.upsert({
      where: { hostId_month: { hostId, month } },
      create: {
        hostId,
        month,
        totalRevenue: numbers.totalRevenue,
        commission: numbers.commission,
        refundedAmount: numbers.refundedAmount,
        netPayout: numbers.netPayout,
        status: autoStatus,
      },
      update: {
        totalRevenue: numbers.totalRevenue,
        commission: numbers.commission,
        refundedAmount: numbers.refundedAmount,
        netPayout: numbers.netPayout,
        status: autoStatus,
      },
    });
  },

  // List all payout statements for a host, newest first.
  async listForHost(hostId: string) {
    return prisma.hostPayout.findMany({
      where: { hostId },
      orderBy: { month: "desc" },
    });
  },

  // Admin: list all payouts with host info, filterable.
  async listForAdmin(filters: { hostId?: string; status?: string; month?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.hostId) where.hostId = filters.hostId;
    if (filters.status && ["PENDING", "READY", "PAID"].includes(filters.status)) {
      where.status = filters.status as PayoutStatus;
    }
    if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) where.month = filters.month;

    const payouts = await prisma.hostPayout.findMany({
      where,
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      include: { host: { select: { id: true, email: true, displayName: true } } },
    });

    return payouts.map((p) => {
      const adj = p.adjustmentAmount ? Number(p.adjustmentAmount) : 0;
      const effective = Number(p.netPayout) + adj;
      return {
        id: p.id,
        hostId: p.hostId,
        hostEmail: p.host.email,
        hostName: p.host.displayName ?? p.host.email,
        month: p.month,
        totalRevenue: Number(p.totalRevenue),
        commission: Number(p.commission),
        refundedAmount: Number(p.refundedAmount),
        netPayout: Number(p.netPayout),
        adjustmentAmount: adj,
        adjustmentReason: p.adjustmentReason ?? null,
        effectivePayout: effective,
        status: p.status,
        paidAt: p.paidAt?.toISOString() ?? null,
        notes: p.notes ?? null,
        // formatted
        totalRevenueF: formatVND(Number(p.totalRevenue)),
        commissionF: formatVND(Number(p.commission)),
        refundedAmountF: formatVND(Number(p.refundedAmount)),
        netPayoutF: formatVND(Number(p.netPayout)),
        adjustmentAmountF: adj !== 0 ? formatVND(Math.abs(adj)) : null,
        effectivePayoutF: formatVND(effective),
      };
    });
  },

  // Admin: set an adjustment on a payout (positive = bonus, negative = deduction).
  // PAID payouts can still be adjusted (post-payment corrections), but the
  // caller must pass allowPaid=true to confirm the intent explicitly.
  async adjustPayout(
    payoutId: string,
    adjustmentAmount: number,
    adjustmentReason: string,
    allowPaid = false,
  ) {
    const payout = await prisma.hostPayout.findUnique({ where: { id: payoutId } });
    if (!payout) return { kind: "NOT_FOUND" as const };
    if (payout.status === PayoutStatus.PAID && !allowPaid) {
      return { kind: "PAYOUT_ALREADY_PAID" as const };
    }

    const updated = await prisma.hostPayout.update({
      where: { id: payoutId },
      data: { adjustmentAmount, adjustmentReason },
    });
    return { kind: "SUCCESS" as const, data: updated };
  },

  // Admin: mark a payout as PAID.
  async confirmPaid(payoutId: string) {
    const payout = await prisma.hostPayout.findUnique({ where: { id: payoutId } });
    if (!payout) return { kind: "NOT_FOUND" as const };
    if (payout.status === PayoutStatus.PAID) return { kind: "ALREADY_PAID" as const };
    if (payout.status === PayoutStatus.PENDING) return { kind: "NOT_READY" as const };

    const updated = await prisma.hostPayout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.PAID, paidAt: new Date() },
    });
    return { kind: "SUCCESS" as const, data: updated };
  },
};
