import { prisma } from "../lib/prisma";
import { payoutService } from "./payout.service";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function nightsBetween(checkIn: Date | null, checkOut: Date | null): number | null {
  if (!checkIn || !checkOut) return null;
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

export const revenueService = {
  async getHostRevenue(hostId: string, month?: string) {
    const resolvedMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : currentMonth();
    const parts = resolvedMonth.split("-").map(Number);
    const y = parts[0]!;
    const m = parts[1]!;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1); // exclusive

    const properties = await prisma.property.findMany({
      where: { hostId },
      select: { id: true, title: true, commission: true },
    });

    if (properties.length === 0) {
      return {
        summary: {
          totalRevenue: 0, commission: 0, netPayout: 0,
          pendingRevenue: 0, refundedAmount: 0,
          paidBookingsCount: 0, pendingPaymentCount: 0, refundedCount: 0,
          month: resolvedMonth,
        },
        payout: null,
        bookings: [],
      };
    }

    const propertyIds = properties.map((p) => p.id);
    const commMap = new Map(properties.map((p) => [p.id, Number(p.commission)]));
    const titleMap = new Map(properties.map((p) => [p.id, p.title]));

    // ── 1. PAID bookings — filter by payment.paidAt in month ──────────────────
    const paidBookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: propertyIds },
        paymentStatus: "PAID",
        payment: { paidAt: { gte: startDate, lt: endDate } },
      },
      select: {
        id: true, propertyId: true, checkIn: true, checkOut: true, totalPrice: true,
        user: { select: { displayName: true, email: true } },
        payment: {
          select: { amount: true, paidAt: true, refundAmount: true, transferReference: true },
        },
      },
      orderBy: { payment: { paidAt: "desc" } },
    });

    // ── 2. REFUNDED/PARTIALLY_REFUNDED — filter by refundedAt (or updatedAt fallback) ──
    const refundedBookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: propertyIds },
        paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
        payment: {
          OR: [
            { refundedAt: { gte: startDate, lt: endDate } },
            // fallback for records before refundedAt field existed
            { AND: [{ refundedAt: null }, { updatedAt: { gte: startDate, lt: endDate } }] },
          ],
        },
      },
      select: {
        id: true, propertyId: true, checkIn: true, checkOut: true, totalPrice: true,
        paymentStatus: true,
        user: { select: { displayName: true, email: true } },
        payment: {
          select: { amount: true, refundAmount: true, refundedAt: true, transferReference: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // ── 3. PENDING_PAYMENT — always all, no month filter ─────────────────────
    const pendingBookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: propertyIds },
        paymentStatus: "PENDING_PAYMENT",
      },
      select: {
        id: true, propertyId: true, checkIn: true, checkOut: true, totalPrice: true,
        user: { select: { displayName: true, email: true } },
        payment: { select: { amount: true, transferReference: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    let totalRevenue = 0;
    let totalCommission = 0;

    for (const b of paidBookings) {
      const amt = Number(b.payment!.amount);
      const rate = commMap.get(b.propertyId!) ?? 0.15;
      totalRevenue += amt;
      totalCommission += amt * rate;
    }

    const totalRefunded = refundedBookings.reduce(
      (s, b) => s + Number(b.payment?.refundAmount ?? b.payment?.amount ?? 0),
      0,
    );
    const pendingRevenue = pendingBookings.reduce(
      (s, b) => s + Number(b.payment!.amount),
      0,
    );

    // ── Booking rows ──────────────────────────────────────────────────────────
    function makeRow(
      b: (typeof paidBookings)[number],
      status: "PAID",
      paidAt: string | null,
    ) {
      const amt = Number(b.payment!.amount);
      const rate = commMap.get(b.propertyId!) ?? 0.15;
      const comm = Math.round(amt * rate);
      return {
        id: b.id,
        propertyTitle: titleMap.get(b.propertyId!) ?? "",
        guestName: b.user.displayName ?? b.user.email,
        checkIn: b.checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: b.checkOut?.toISOString().slice(0, 10) ?? null,
        nights: nightsBetween(b.checkIn, b.checkOut),
        totalPrice: Number(b.totalPrice),
        amount: amt,
        commission: comm,
        netAmount: amt - comm,
        paymentStatus: status,
        paidAt,
        transferReference: b.payment!.transferReference ?? null,
      };
    }

    const bookings = [
      ...paidBookings.map((b) =>
        makeRow(b, "PAID", b.payment!.paidAt?.toISOString() ?? null),
      ),
      ...refundedBookings.map((b) => {
        const amt = Number(b.payment?.amount ?? 0);
        const refund = Number(b.payment?.refundAmount ?? amt);
        const rate = commMap.get(b.propertyId!) ?? 0.15;
        const comm = Math.round(amt * rate);
        return {
          id: b.id,
          propertyTitle: titleMap.get(b.propertyId!) ?? "",
          guestName: b.user.displayName ?? b.user.email,
          checkIn: b.checkIn?.toISOString().slice(0, 10) ?? null,
          checkOut: b.checkOut?.toISOString().slice(0, 10) ?? null,
          nights: nightsBetween(b.checkIn, b.checkOut),
          totalPrice: Number(b.totalPrice),
          amount: amt,
          commission: comm,
          netAmount: amt - comm,
          paymentStatus: b.paymentStatus as "REFUNDED" | "PARTIALLY_REFUNDED",
          paidAt: null,
          refundAmount: refund,
          transferReference: b.payment?.transferReference ?? null,
        };
      }),
      ...pendingBookings.map((b) => {
        const amt = Number(b.payment!.amount);
        const rate = commMap.get(b.propertyId!) ?? 0.15;
        const comm = Math.round(amt * rate);
        return {
          id: b.id,
          propertyTitle: titleMap.get(b.propertyId!) ?? "",
          guestName: b.user.displayName ?? b.user.email,
          checkIn: b.checkIn?.toISOString().slice(0, 10) ?? null,
          checkOut: b.checkOut?.toISOString().slice(0, 10) ?? null,
          nights: nightsBetween(b.checkIn, b.checkOut),
          totalPrice: Number(b.totalPrice),
          amount: amt,
          commission: comm,
          netAmount: amt - comm,
          paymentStatus: "PENDING_PAYMENT" as const,
          paidAt: null,
          transferReference: b.payment!.transferReference ?? null,
        };
      }),
    ];

    // ── Payout statement (sync/create record) ─────────────────────────────────
    const netPayout = Math.round(totalRevenue - totalCommission - totalRefunded);
    const payoutNumbers = {
      totalRevenue: Math.round(totalRevenue),
      commission: Math.round(totalCommission),
      refundedAmount: Math.round(totalRefunded),
      netPayout,
    };

    // Only sync when there are actual paid transactions this month
    const payout =
      paidBookings.length > 0 || refundedBookings.length > 0
        ? await payoutService.sync(hostId, resolvedMonth, payoutNumbers)
        : await prisma.hostPayout.findUnique({
            where: { hostId_month: { hostId, month: resolvedMonth } },
          });

    return {
      summary: {
        ...payoutNumbers,
        pendingRevenue: Math.round(pendingRevenue),
        paidBookingsCount: paidBookings.length,
        pendingPaymentCount: pendingBookings.length,
        refundedCount: refundedBookings.length,
        month: resolvedMonth,
      },
      payout: payout
        ? {
            id: payout.id,
            status: payout.status,
            paidAt: payout.paidAt?.toISOString() ?? null,
            month: payout.month,
          }
        : null,
      bookings,
    };
  },
};
