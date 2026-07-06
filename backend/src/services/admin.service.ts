import {
  BookingStatus,
  CancellationPolicy,
  DiscountType,
  ListingStatus,
  PaymentMethod,
  PaymentStatus,
  PropertyType,
  TourCategory,
} from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { parseVoucherMetadata } from "../utils/voucher.utils";
import { sessionService } from "./session.service";

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Vừa xong";
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}

function formatVND(amount: number): string {
  return `₫${amount.toLocaleString("vi-VN")}`;
}

function mapBookingStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Chờ xử lý",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã huỷ",
    COMPLETED: "Hoàn tất",
  };
  return map[status] ?? status;
}

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    UNPAID: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    REFUNDED: "Đã hoàn tiền",
  };
  return map[status] ?? status;
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    CASH: "Tiền mặt",
    BANK_TRANSFER: "Chuyển khoản",
    MOMO: "MoMo",
    VNPAY: "VNPay",
    ZALOPAY: "ZaloPay",
    CREDIT_CARD: "Thẻ tín dụng",
  };
  return map[method] ?? method;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return `T${date.getMonth() + 1}/${date.getFullYear()}`;
}

function addToBucket<T extends Record<string, number | string>>(buckets: Map<string, T>, key: string, seed: T, fields: Partial<Record<keyof T, number>>) {
  const current = buckets.get(key) ?? seed;
  Object.entries(fields).forEach(([field, value]) => {
    if (typeof value === "number" && typeof current[field as keyof T] === "number") {
      (current as Record<string, number | string>)[field] = Number(current[field as keyof T]) + value;
    }
  });
  buckets.set(key, current);
}

type RevenueBookingRow = {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  guest: string;
  guestEmail: string;
  property: string;
  province: string;
  propertyType: string;
  checkIn: string;
  checkOut: string;
  createdAt: string;
  settlementPeriod: string;
  grossAmount: number;
  settlementBase: number;
  refundAmount: number;
  penaltyAmount: number;
  commissionRate: number;
  commission: number;
  netRevenue: number;
  transferReceived: number;
  hostDirectReceived: number;
  hostPayout: number;
  commissionReceivable: number;
  adjustment: number;
  status: string;
  refundStatus: string | null;
  refundedAt: string | null;
  paymentMethod: string | null;
  paymentMethodLabel: string;
  paymentModel: string;
  paymentStatus: string;
  payoutStatus: string;
  disputeStatus: string | null;
  disputeSubject: string | null;
};

function buildRevenuePayloadFromRows(input: {
  rows: RevenueBookingRow[];
  period: string;
  generatedAt: string;
  payoutPaidByHost?: Map<string, { paidAt: string | null; paidBy: string | null; status: string }>;
}) {
  const rows = input.rows;
  const sum = (selector: (row: RevenueBookingRow) => number) => rows.reduce((total, row) => total + selector(row), 0);
  const readyRows = rows.filter((row) => row.payoutStatus === "READY_FOR_PAYOUT");
  const refundRows = rows.filter((row) => row.refundAmount > 0 || row.refundStatus);
  const disputeRows = rows.filter((row) => row.payoutStatus === "PENDING_SETTLEMENT");

  const settlementByHost = Array.from(rows.reduce((map, row) => {
    const current = map.get(row.hostId) ?? {
      hostId: row.hostId,
      hostName: row.hostName,
      hostEmail: row.hostEmail,
      period: input.period,
      bookingCount: 0,
      grossAmount: 0,
      refundAmount: 0,
      disputeCount: 0,
      commission: 0,
      adjustment: 0,
      hostPayout: 0,
      commissionReceivable: 0,
      status: "WAITING_SETTLEMENT",
    };
    current.bookingCount += row.payoutStatus === "READY_FOR_PAYOUT" ? 1 : 0;
    current.grossAmount += row.settlementBase;
    current.refundAmount += row.refundAmount;
    current.disputeCount += row.payoutStatus === "PENDING_SETTLEMENT" ? 1 : 0;
    current.commission += row.commission;
    current.adjustment += row.adjustment;
    current.hostPayout += row.hostPayout;
    current.commissionReceivable += row.commissionReceivable;
    current.status = current.disputeCount > 0 ? "PENDING_SETTLEMENT" : current.hostPayout > 0 || current.commissionReceivable > 0 ? "READY_FOR_PAYOUT" : "WAITING_SETTLEMENT";
    map.set(row.hostId, current);
    return map;
  }, new Map<string, {
    hostId: string;
    hostName: string;
    hostEmail: string;
    period: string;
    bookingCount: number;
    grossAmount: number;
    refundAmount: number;
    disputeCount: number;
    commission: number;
    adjustment: number;
    hostPayout: number;
    commissionReceivable: number;
    status: string;
  }>()).values()).sort((a, b) => b.grossAmount - a.grossAmount);

  const monthBuckets = new Map<string, { month: string; grossBookingValue: number; netRevenue: number; refundAmount: number; hostPayout: number }>();
  const provinceBuckets = new Map<string, { province: string; grossBookingValue: number; netRevenue: number; bookings: number }>();
  const typeBuckets = new Map<string, { propertyType: string; grossBookingValue: number; netRevenue: number; bookings: number }>();

  rows.forEach((row) => {
    const date = new Date(row.checkOut || row.createdAt);
    addToBucket(monthBuckets, row.settlementPeriod, {
      month: monthLabel(date),
      grossBookingValue: 0,
      netRevenue: 0,
      refundAmount: 0,
      hostPayout: 0,
    }, {
      grossBookingValue: row.grossAmount,
      netRevenue: row.netRevenue,
      refundAmount: row.refundAmount,
      hostPayout: row.hostPayout,
    });
    addToBucket(provinceBuckets, row.province, {
      province: row.province,
      grossBookingValue: 0,
      netRevenue: 0,
      bookings: 0,
    }, {
      grossBookingValue: row.grossAmount,
      netRevenue: row.netRevenue,
      bookings: 1,
    });
    addToBucket(typeBuckets, row.propertyType, {
      propertyType: row.propertyType,
      grossBookingValue: 0,
      netRevenue: 0,
      bookings: 0,
    }, {
      grossBookingValue: row.grossAmount,
      netRevenue: row.netRevenue,
      bookings: 1,
    });
  });

  return {
    generatedAt: input.generatedAt,
    period: input.period,
    snapshot: true,
    summary: {
      grossBookingValue: sum((row) => row.grossAmount),
      netRevenue: sum((row) => row.netRevenue),
      pendingPayout: sum((row) => row.hostPayout),
      commissionReceivable: sum((row) => row.commissionReceivable),
      totalRefund: sum((row) => row.refundAmount),
      disputedBookings: disputeRows.length,
      waitingSettlementBookings: rows.filter((row) => row.payoutStatus === "WAITING_SETTLEMENT").length,
      readyBookings: readyRows.length,
      cancellationRate: rows.length ? Math.round((rows.filter((row) => row.status === BookingStatus.CANCELLED).length / rows.length) * 1000) / 10 : 0,
      refundRate: rows.length ? Math.round((refundRows.length / rows.length) * 1000) / 10 : 0,
    },
    charts: {
      monthly: Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
      byProvince: Array.from(provinceBuckets.values()).sort((a, b) => b.grossBookingValue - a.grossBookingValue),
      byPropertyType: Array.from(typeBuckets.values()).sort((a, b) => b.grossBookingValue - a.grossBookingValue),
    },
    settlements: settlementByHost,
    bookingDetails: rows,
    refunds: refundRows,
    disputes: disputeRows,
    payouts: settlementByHost.filter((row) => row.hostPayout > 0 || row.commissionReceivable > 0).map((row) => {
      const paid = input.payoutPaidByHost?.get(row.hostId);
      return {
        hostId: row.hostId,
        hostName: row.hostName,
        period: row.period,
        bookingCount: row.bookingCount,
        amount: row.hostPayout,
        commissionReceivable: row.commissionReceivable,
        status: paid?.status ?? (row.status === "READY_FOR_PAYOUT" ? "READY" : "PENDING"),
        paidAt: paid?.paidAt ?? null,
        paidBy: paid?.paidBy ?? null,
      };
    }),
  };
}

export type CreatePropertyInput = {
  title: string;
  description?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  country: string;
  pricePerNight: number;
  cleaningFee?: number;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  type: PropertyType;
  cancellationPolicy: CancellationPolicy;
  hostId: string;
  thumbnailUrl?: string;
};

export type CreateTourInput = {
  title: string;
  description: string;
  city: string;
  country: string;
  pricePerPerson: number;
  durationDays: number;
  minGroupSize: number;
  maxGroupSize: number;
  category: TourCategory;
  hostId: string;
  thumbnailUrl?: string;
};

function toNumber(value: { toNumber(): number } | null) {
  return value ? value.toNumber() : null;
}

const ROLE_SORT_ORDER: Record<string, number> = {
  OPERATOR_PROVINCE: 1,
  OPERATOR_SUB: 2,
  HOST: 3,
  GUEST: 4,
};

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDateFilter(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapAuditAction(action: string) {
  const map: Record<string, string> = {
    LOGIN: "Đăng nhập",
    LOGOUT: "Đăng xuất",
    REGISTER: "Đăng ký",
    SEARCH: "Tìm kiếm",
    UPDATE_PROFILE: "Cập nhật hồ sơ",
  };
  return map[action] ?? action;
}

export const adminService = {
  async listUsers() {
    const users = await prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        bankName: true,
        bankAccountNumber: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    return users
      .map((user) => {
        const activeNow = sessionService.isActive(user.id);
        const lastSeenAt = sessionService.getLastSeenAt(user.id);
        return {
          ...user,
          activeNow,
          accountStatus: activeNow ? "ONLINE" : "OFFLINE",
          lastSeenAt: lastSeenAt?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (a.activeNow !== b.activeNow) return a.activeNow ? -1 : 1;

        const roleCompare = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
        if (roleCompare !== 0) return roleCompare;

        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  },

  async getUserDetail(userId: string, filters: { from?: string; to?: string; type?: string }) {
    const fromDate = parseDateFilter(filters.from);
    const toDate = endOfDay(parseDateFilter(filters.to) ?? fromDate ?? new Date());
    const activityType = filters.type && filters.type !== "ALL" ? filters.type : undefined;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        nationality: true,
        gender: true,
        address: true,
        bankName: true,
        bankAccountNumber: true,
        role: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return null;

    const createdAtFilter = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };

    const [reviews, bookings, auditLogs] = await prisma.$transaction([
      prisma.review.findMany({
        where: { userId, createdAt: createdAtFilter },
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            select: {
              property: { select: { title: true } },
              tour: { select: { title: true } },
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: { userId, createdAt: createdAtFilter },
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { title: true } },
          tour: { select: { title: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: { userId, createdAt: createdAtFilter },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const activities = [
      ...reviews.map((review) => ({
        id: `review-${review.id}`,
        type: "REVIEW",
        activityName: "Đánh giá",
        place: review.booking.property?.title ?? review.booking.tour?.title ?? "Không rõ",
        performedAt: review.createdAt.toISOString(),
      })),
      ...bookings.map((booking) => ({
        id: `booking-${booking.id}`,
        type: "BOOKING",
        activityName: booking.type === "PROPERTY" ? "Đặt chỗ ở" : "Đặt tour",
        place: booking.property?.title ?? booking.tour?.title ?? "Không rõ",
        performedAt: booking.createdAt.toISOString(),
      })),
      ...auditLogs.map((log) => ({
        id: `audit-${log.id}`,
        type: log.action === "SEARCH" ? "SEARCH" : "SYSTEM",
        activityName: mapAuditAction(log.action),
        place:
          log.action === "SEARCH" &&
          log.newValue &&
          typeof log.newValue === "object" &&
          "keyword" in log.newValue &&
          typeof log.newValue.keyword === "string"
            ? log.newValue.keyword
            : log.entity,
        performedAt: log.createdAt.toISOString(),
      })),
    ]
      .filter((activity) => !activityType || activity.type === activityType)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

    const activeNow = sessionService.isActive(user.id);
    const lastSeenAt = sessionService.getLastSeenAt(user.id);

    return {
      user: {
        ...user,
        birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        activeNow,
        accountStatus: activeNow ? "ONLINE" : "OFFLINE",
        lastSeenAt: lastSeenAt?.toISOString() ?? null,
      },
      activities,
    };
  },

  async getListingSummary() {
    const [totalProperties, totalTours, pendingProperties, pendingTours, activeProperties, activeTours, inactiveProperties, inactiveTours] =
      await prisma.$transaction([
        prisma.property.count(),
        prisma.tour.count(),
        prisma.property.count({ where: { status: ListingStatus.PENDING } }),
        prisma.tour.count({ where: { status: ListingStatus.PENDING } }),
        prisma.property.count({ where: { status: ListingStatus.ACTIVE } }),
        prisma.tour.count({ where: { status: ListingStatus.ACTIVE } }),
        prisma.property.count({ where: { status: ListingStatus.INACTIVE } }),
        prisma.tour.count({ where: { status: ListingStatus.INACTIVE } }),
      ]);

    return {
      total: totalProperties + totalTours,
      pending: pendingProperties + pendingTours,
      active: activeProperties + activeTours,
      inactive: inactiveProperties + inactiveTours,
    };
  },

  async listListings() {
    const [properties, tours] = await prisma.$transaction([
      prisma.property.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          host: { select: { id: true, email: true } },
        },
      }),
      prisma.tour.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          host: { select: { id: true, email: true } },
        },
      }),
    ]);

    return [
      ...properties.map((property) => ({
        id: property.id,
        kind: "PROPERTY" as const,
        title: property.title,
        owner: property.host.email,
        ownerEmail: property.host.email,
        city: property.city,
        price: property.pricePerNight.toNumber(),
        status: property.status,
        createdAt: property.createdAt.toISOString(),
      })),
      ...tours.map((tour) => ({
        id: tour.id,
        kind: "TOUR" as const,
        title: tour.title,
        owner: tour.host.email,
        ownerEmail: tour.host.email,
        city: tour.city,
        price: tour.pricePerPerson.toNumber(),
        status: tour.status,
        createdAt: tour.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listHosts() {
    return prisma.user.findMany({
      where: { role: "HOST", isActive: true },
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    });
  },

  async createProperty(input: CreatePropertyInput) {
    return prisma.property.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        addressLine1: input.addressLine1,
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
        city: input.city,
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        country: input.country,
        pricePerNight: input.pricePerNight,
        ...(input.cleaningFee !== undefined ? { cleaningFee: input.cleaningFee } : {}),
        maxGuests: input.maxGuests,
        bedroomCount: input.bedroomCount,
        bathrooms: input.bathrooms,
        type: input.type,
        cancellationPolicy: input.cancellationPolicy,
        status: ListingStatus.PENDING,
        hostId: input.hostId,
        ...(input.thumbnailUrl
          ? {
              images: {
                create: {
                  url: input.thumbnailUrl,
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async createTour(input: CreateTourInput) {
    return prisma.tour.create({
      data: {
        title: input.title,
        description: input.description,
        city: input.city,
        country: input.country,
        pricePerPerson: input.pricePerPerson,
        durationDays: input.durationDays,
        minGroupSize: input.minGroupSize,
        maxGroupSize: input.maxGroupSize,
        category: input.category,
        status: ListingStatus.PENDING,
        hostId: input.hostId,
        ...(input.thumbnailUrl
          ? {
              images: {
                create: {
                  url: input.thumbnailUrl,
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async updateListingStatus(kind: "PROPERTY" | "TOUR", id: string, status: ListingStatus) {
    if (kind === "PROPERTY") {
      return prisma.property.update({
        where: { id },
        data: { status },
      });
    }

    return prisma.tour.update({
      where: { id },
      data: { status },
    });
  },

  async deleteListing(kind: "PROPERTY" | "TOUR", id: string) {
    if (kind === "PROPERTY") {
      return prisma.property.delete({ where: { id } });
    }

    return prisma.tour.delete({ where: { id } });
  },

  async getDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalUsers,
      pendingProperties,
      pendingTours,
      pendingBookings,
      totalBookingsThisMonth,
      revenueThisMonth,
      totalBookings,
      completedBookings,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.property.count({ where: { status: ListingStatus.PENDING } }),
      prisma.tour.count({ where: { status: ListingStatus.PENDING } }),
      prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
    ]);

    const [payments6Months, bookings6Months] = await prisma.$transaction([
      prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, paidAt: { gte: startOf6MonthsAgo } },
        select: { amount: true, paidAt: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: startOf6MonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const monthLabels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: monthLabels[d.getMonth()], year: d.getFullYear(), month: d.getMonth() };
    });

    const revenueSeries = months.map(({ label, year, month }) => ({
      month: label,
      revenue: Math.round(
        payments6Months
          .filter((p) => p.paidAt && p.paidAt.getFullYear() === year && p.paidAt.getMonth() === month)
          .reduce((sum, p) => sum + p.amount.toNumber(), 0) / 1_000_000
      ),
      bookings: bookings6Months.filter(
        (b) => b.createdAt.getFullYear() === year && b.createdAt.getMonth() === month
      ).length,
    }));

    const [pendingPropertyItems, pendingTourItems] = await prisma.$transaction([
      prisma.property.findMany({
        where: { status: ListingStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { host: { select: { email: true } } },
      }),
      prisma.tour.findMany({
        where: { status: ListingStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { host: { select: { email: true } } },
      }),
    ]);

    const pendingListings = [
      ...pendingPropertyItems.map((p) => ({
        name: p.title, type: "Property", host: p.host.email, city: p.city, age: formatAge(p.createdAt),
      })),
      ...pendingTourItems.map((t) => ({
        name: t.title, type: "Tour", host: t.host.email, city: t.city, age: formatAge(t.createdAt),
      })),
    ].slice(0, 5);

    const completionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 1000) / 10
      : 0;

    return {
      metrics: {
        revenueThisMonth: revenueThisMonth._sum.amount?.toNumber() ?? 0,
        newBookingsThisMonth: totalBookingsThisMonth,
        pendingListings: pendingProperties + pendingTours,
        completionRate,
      },
      revenueSeries,
      pendingListings,
      pendingBookings,
      totalReviews: await prisma.review.count(),
    };
  },

  async listAdminBookings() {
    const bookings = await prisma.booking.findMany({
      where: { type: "PROPERTY" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        property: { select: { title: true, commission: true } },
        tour: { select: { title: true } },
        promotion: { select: { code: true, description: true, discountType: true, discountValue: true } },
        payment: { select: { method: true, amount: true, status: true } },
      },
    });

    return bookings.map((b) => {
      const item = b.property?.title ?? b.tour?.title ?? "—";
      let dateRange = "";
      if (b.checkIn && b.checkOut) {
        const ci = b.checkIn.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        const co = b.checkOut.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        dateRange = `${ci}–${co}`;
      } else if (b.tourDate) {
        dateRange = b.tourDate.toLocaleDateString("vi-VN");
      }

      return {
        id: `BK-${b.id.slice(-8).toUpperCase()}`,
        fullId: b.id,
        guest: b.user.email,
        item,
        type: b.type,
        date: dateRange,
        amount: formatVND(b.totalPrice.toNumber()),
        status: mapBookingStatus(b.status),
        rawStatus: b.status,
        paymentMethod: b.payment ? mapPaymentMethod(b.payment.method) : "—",
      };
    });
  },

  async listAdminPropertyBookings() {
    const bookings = await prisma.booking.findMany({
      where: { type: "PROPERTY" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        property: { select: { title: true, commission: true } },
        promotion: { select: { code: true, description: true, discountType: true, discountValue: true } },
        payment: { select: { method: true, amount: true, status: true } },
      },
    });

    return bookings.map((booking) => {
      const guestPaidValue = booking.totalPrice.toNumber();
      const cancellationRefundValue = booking.cancellationRefundAmount?.toNumber() ?? 0;
      const cancellationPenaltyValue = booking.cancellationPenaltyAmount?.toNumber() ?? 0;
      const isCancelled = booking.status === "CANCELLED";
      const commissionRate = booking.property?.commission?.toNumber() ?? 0.15;
      const voucherMetadata = parseVoucherMetadata(booking.promotion?.description);
      const discountRate = booking.promotion?.discountType === "PERCENTAGE"
        ? booking.promotion.discountValue.toNumber() / 100
        : 0;
      const fixedDiscount = booking.promotion?.discountType === "FIXED_AMOUNT"
        ? Math.round(booking.promotion.discountValue.toNumber())
        : 0;
      const originalPriceValue = booking.promotion
        ? booking.promotion.discountType === "PERCENTAGE"
          ? Math.round(guestPaidValue / Math.max(0.01, 1 - discountRate))
          : guestPaidValue + fixedDiscount
        : guestPaidValue;
      const totalDiscountValue = Math.max(0, originalPriceValue - guestPaidValue);
      const hostDiscountValue = voucherMetadata?.kind === "HOST_PROPERTY_VOUCHER" ? totalDiscountValue : 0;
      const systemDiscountValue = voucherMetadata?.kind === "SYSTEM_VOUCHER" ? totalDiscountValue : 0;
      const transferReceivedValue = booking.payment?.method === "BANK_TRANSFER" ? booking.payment.amount.toNumber() : 0;
      const settlementBaseValue = isCancelled ? cancellationPenaltyValue : originalPriceValue;
      const platformFeeValue = Math.round(settlementBaseValue * commissionRate);
      const businessRevenueValue = isCancelled
        ? Math.max(0, platformFeeValue)
        : Math.max(0, platformFeeValue - systemDiscountValue);
      const hostReceivableValue = isCancelled
        ? Math.max(0, cancellationPenaltyValue - platformFeeValue)
        : Math.max(0, originalPriceValue - platformFeeValue - hostDiscountValue);
      const hostDirectReceivedValue = isCancelled ? 0 : Math.max(0, guestPaidValue - transferReceivedValue);
      const checkIn = booking.checkIn?.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) ?? "";
      const checkOut = booking.checkOut?.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) ?? "";

      return {
        id: `BK-${booking.id.slice(-8).toUpperCase()}`,
        fullId: booking.id,
        guest: booking.user.email,
        item: booking.property?.title ?? "Chỗ ở",
        date: checkIn && checkOut ? `${checkIn} - ${checkOut}` : "",
        amount: formatVND(guestPaidValue),
        guestPaid: formatVND(isCancelled ? cancellationPenaltyValue : guestPaidValue),
        guestPaidValue: isCancelled ? cancellationPenaltyValue : guestPaidValue,
        originalPrice: formatVND(originalPriceValue),
        originalPriceValue,
        hostDiscount: formatVND(hostDiscountValue),
        hostDiscountValue,
        systemDiscount: formatVND(systemDiscountValue),
        systemDiscountValue,
        revenue: businessRevenueValue,
        businessAmount: formatVND(businessRevenueValue),
        businessRevenue: businessRevenueValue,
        platformFee: formatVND(platformFeeValue),
        platformFeeValue,
        hostReceivable: formatVND(hostReceivableValue),
        hostReceivableValue,
        commissionRate,
        transferReceived: formatVND(transferReceivedValue),
        transferReceivedValue,
        hostDirectReceived: formatVND(hostDirectReceivedValue),
        hostDirectReceivedValue,
        cancellationRefundAmount: cancellationRefundValue,
        cancellationRefund: formatVND(cancellationRefundValue),
        cancellationPenaltyAmount: cancellationPenaltyValue,
        cancellationPenalty: formatVND(cancellationPenaltyValue),
        refundStatus: booking.refundStatus ?? null,
        refundedAt: booking.refundedAt?.toISOString() ?? null,
        voucherCode: booking.promotion?.code ?? null,
        voucherOwner: voucherMetadata?.kind === "SYSTEM_VOUCHER" ? "ADMIN" : voucherMetadata?.kind === "HOST_PROPERTY_VOUCHER" ? "HOST" : null,
        voucherDiscount: totalDiscountValue > 0 ? formatVND(totalDiscountValue) : null,
        voucherDiscountValue: totalDiscountValue,
        status: mapBookingStatus(booking.status),
        rawStatus: booking.status,
        paymentMethod: booking.payment ? mapPaymentMethod(booking.payment.method) : "—",
        paymentStatus: booking.payment
          ? booking.payment.method === "BANK_TRANSFER"
            ? "Đã thanh toán"
            : mapPaymentStatus(booking.payment.status)
          : "—",
      };
    });
  },

  async listAdminPayments() {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        booking: { select: { id: true, user: { select: { email: true } } } },
      },
    });

    return payments.map((p) => ({
      id: `PM-${p.id.slice(-6).toUpperCase()}`,
      fullId: p.id,
      booking: `BK-${p.booking.id.slice(-8).toUpperCase()}`,
      bookingId: p.booking.id,
      method: mapPaymentMethod(p.method),
      amount: formatVND(p.amount.toNumber()),
      status: mapPaymentStatus(p.status),
      paidAt: p.paidAt ? p.paidAt.toLocaleDateString("vi-VN") : "—",
    }));
  },

  async getSettlementSnapshot(period: string) {
    const settlement = await prisma.settlementRun.findUnique({
      where: { period },
      include: {
        bookings: { orderBy: { createdAt: "asc" } },
        payouts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!settlement) return null;

    const paidMap = new Map(settlement.payouts.map((payout) => [
      payout.hostId,
      {
        paidAt: payout.paidAt?.toISOString() ?? null,
        paidBy: payout.paidBy,
        status: payout.status,
      },
    ]));

    return buildRevenuePayloadFromRows({
      period: settlement.period,
      generatedAt: settlement.generatedAt.toISOString(),
      payoutPaidByHost: paidMap,
      rows: settlement.bookings.map((row) => ({
        id: row.bookingId,
        code: row.code,
        hostId: row.hostId,
        hostName: row.hostName,
        hostEmail: row.hostEmail ?? "",
        guest: row.guest,
        guestEmail: row.guestEmail,
        property: row.property,
        province: row.province,
        propertyType: row.propertyType,
        checkIn: row.checkIn ?? "",
        checkOut: row.checkOut ?? "",
        createdAt: row.createdAtSnapshot.toISOString(),
        settlementPeriod: row.settlementPeriod,
        grossAmount: row.grossAmount.toNumber(),
        settlementBase: row.settlementBase.toNumber(),
        refundAmount: row.refundAmount.toNumber(),
        penaltyAmount: row.penaltyAmount.toNumber(),
        commissionRate: row.commissionRate.toNumber(),
        commission: row.commission.toNumber(),
        netRevenue: row.netRevenue.toNumber(),
        transferReceived: row.transferReceived.toNumber(),
        hostDirectReceived: row.hostDirectReceived.toNumber(),
        hostPayout: row.hostPayout.toNumber(),
        commissionReceivable: row.commissionReceivable.toNumber(),
        adjustment: row.adjustment.toNumber(),
        status: row.bookingStatus,
        refundStatus: row.refundStatus,
        refundedAt: row.refundedAt?.toISOString() ?? null,
        paymentMethod: row.paymentMethod,
        paymentMethodLabel: row.paymentMethodLabel,
        paymentModel: row.paymentModel,
        paymentStatus: row.paymentStatus,
        payoutStatus: row.payoutStatus,
        disputeStatus: row.disputeStatus,
        disputeSubject: row.disputeSubject,
      })),
    });
  },

  async getRevenueManagement(period?: string, options: { ignoreSnapshot?: boolean } = {}) {
    const now = new Date();
    const targetPeriod = period ?? monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (!options.ignoreSnapshot) {
      const snapshot = await this.getSettlementSnapshot(targetPeriod);
      if (snapshot) return snapshot;
    }
    const bookings = await prisma.booking.findMany({
      where: { type: "PROPERTY" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true, displayName: true } },
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            type: true,
            commission: true,
            host: { select: { id: true, email: true, name: true, displayName: true } },
          },
        },
        payment: { select: { method: true, amount: true, status: true, paidAt: true } },
      },
    });

    const disputes = await prisma.dispute.findMany({
      where: {
        bookingId: { in: bookings.map((booking) => booking.id) },
        status: { in: ["OPEN", "INVESTIGATING", "ESCALATED"] },
      },
      select: { bookingId: true, status: true, subject: true },
    });
    const disputeByBooking = new Map(disputes.filter((dispute) => dispute.bookingId).map((dispute) => [dispute.bookingId as string, dispute]));

    const rows = bookings.map((booking) => {
      const total = booking.totalPrice.toNumber();
      const refundAmount = booking.cancellationRefundAmount?.toNumber() ?? 0;
      const penaltyAmount = booking.cancellationPenaltyAmount?.toNumber() ?? 0;
      const isCancelled = booking.status === BookingStatus.CANCELLED;
      const isChargeableCancel = isCancelled && penaltyAmount > 0;
      const isCompletedLike = booking.status === BookingStatus.COMPLETED || (booking.status === BookingStatus.CONFIRMED && booking.checkOut !== null && booking.checkOut <= now);
      const dispute = disputeByBooking.get(booking.id);
      const hasDispute = Boolean(dispute);
      const requiresRefund = isCancelled && refundAmount > 0;
      const isRefunded = booking.refundStatus === "REFUNDED";
      const isEligible = !hasDispute && (isCompletedLike || isChargeableCancel) && (!requiresRefund || isRefunded) && !requiresRefund;
      const settlementBase = isChargeableCancel ? penaltyAmount : isEligible ? total : 0;
      const commissionRate = booking.property?.commission?.toNumber() ?? 0.15;
      const commission = Math.round(settlementBase * commissionRate);
      const transferReceived = booking.payment?.method === PaymentMethod.BANK_TRANSFER ? booking.payment.amount.toNumber() : 0;
      const hostDirectReceived = booking.payment?.method === PaymentMethod.CASH && !isCancelled
        ? total
        : booking.payment?.method === PaymentMethod.BANK_TRANSFER && !isCancelled
          ? Math.max(0, total - transferReceived)
          : 0;
      const tripNestHeldForSettlement = isChargeableCancel ? penaltyAmount : isEligible ? transferReceived : 0;
      const hostPayout = Math.max(0, tripNestHeldForSettlement - commission);
      const commissionReceivable = Math.max(0, commission - tripNestHeldForSettlement);
      const netRevenue = isEligible ? commission : 0;
      const payoutStatus = hasDispute
        ? "PENDING_SETTLEMENT"
        : requiresRefund
          ? isRefunded ? "REFUNDED" : "REFUND_PENDING"
          : isEligible
            ? "READY_FOR_PAYOUT"
            : "WAITING_SETTLEMENT";
      const paymentModel = booking.payment?.method === PaymentMethod.CASH ? "PAY_AT_PROPERTY" : transferReceived >= total ? "PAY_FULL" : transferReceived > 0 ? "DEPOSIT_30" : "UNPAID";
      const hostName = booking.property?.host.displayName ?? booking.property?.host.name ?? booking.property?.host.email ?? "Host";
      const guestName = booking.user.displayName ?? booking.user.name ?? booking.user.email;

      return {
        id: booking.id,
        code: `BK-${booking.id.slice(-8).toUpperCase()}`,
        hostId: booking.property?.host.id ?? "unknown",
        hostName,
        hostEmail: booking.property?.host.email ?? "",
        guest: guestName,
        guestEmail: booking.user.email,
        property: booking.property?.title ?? "Chỗ ở",
        province: booking.property?.city ?? "Không rõ",
        propertyType: booking.property?.type ?? "PROPERTY",
        checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? "",
        checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? "",
        createdAt: booking.createdAt.toISOString(),
        settlementPeriod: monthKey(booking.checkOut ?? booking.createdAt),
        grossAmount: total,
        settlementBase,
        refundAmount,
        penaltyAmount,
        commissionRate,
        commission,
        netRevenue,
        transferReceived,
        hostDirectReceived,
        hostPayout,
        commissionReceivable,
        adjustment: 0,
        status: booking.status,
        refundStatus: booking.refundStatus ?? null,
        refundedAt: booking.refundedAt?.toISOString() ?? null,
        paymentMethod: booking.payment?.method ?? null,
        paymentMethodLabel: booking.payment ? mapPaymentMethod(booking.payment.method) : "—",
        paymentModel,
        paymentStatus: booking.payment?.status ?? booking.paymentStatus,
        payoutStatus,
        disputeStatus: dispute?.status ?? null,
        disputeSubject: dispute?.subject ?? null,
      };
    });

    const sum = (selector: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + selector(row), 0);
    const readyRows = rows.filter((row) => row.payoutStatus === "READY_FOR_PAYOUT");
    const refundRows = rows.filter((row) => row.refundAmount > 0 || row.refundStatus);
    const disputeRows = rows.filter((row) => row.payoutStatus === "PENDING_SETTLEMENT");

    const settlementByHost = Array.from(rows.reduce((map, row) => {
      const current = map.get(row.hostId) ?? {
        hostId: row.hostId,
        hostName: row.hostName,
        hostEmail: row.hostEmail,
        period: row.settlementPeriod,
        bookingCount: 0,
        grossAmount: 0,
        refundAmount: 0,
        disputeCount: 0,
        commission: 0,
        adjustment: 0,
        hostPayout: 0,
        commissionReceivable: 0,
        status: "WAITING_SETTLEMENT",
      };
      current.bookingCount += row.payoutStatus === "READY_FOR_PAYOUT" ? 1 : 0;
      current.grossAmount += row.settlementBase;
      current.refundAmount += row.refundAmount;
      current.disputeCount += row.payoutStatus === "PENDING_SETTLEMENT" ? 1 : 0;
      current.commission += row.commission;
      current.hostPayout += row.hostPayout;
      current.commissionReceivable += row.commissionReceivable;
      current.status = current.disputeCount > 0 ? "PENDING_SETTLEMENT" : current.hostPayout > 0 || current.commissionReceivable > 0 ? "READY_FOR_PAYOUT" : "WAITING_SETTLEMENT";
      map.set(row.hostId, current);
      return map;
    }, new Map<string, {
      hostId: string;
      hostName: string;
      hostEmail: string;
      period: string;
      bookingCount: number;
      grossAmount: number;
      refundAmount: number;
      disputeCount: number;
      commission: number;
      adjustment: number;
      hostPayout: number;
      commissionReceivable: number;
      status: string;
    }>()).values()).sort((a, b) => b.grossAmount - a.grossAmount);

    const monthBuckets = new Map<string, { month: string; grossBookingValue: number; netRevenue: number; refundAmount: number; hostPayout: number }>();
    const provinceBuckets = new Map<string, { province: string; grossBookingValue: number; netRevenue: number; bookings: number }>();
    const typeBuckets = new Map<string, { propertyType: string; grossBookingValue: number; netRevenue: number; bookings: number }>();

    rows.forEach((row) => {
      const date = new Date(row.checkOut || row.createdAt);
      addToBucket(monthBuckets, row.settlementPeriod, {
        month: monthLabel(date),
        grossBookingValue: 0,
        netRevenue: 0,
        refundAmount: 0,
        hostPayout: 0,
      }, {
        grossBookingValue: row.grossAmount,
        netRevenue: row.netRevenue,
        refundAmount: row.refundAmount,
        hostPayout: row.hostPayout,
      });
      addToBucket(provinceBuckets, row.province, {
        province: row.province,
        grossBookingValue: 0,
        netRevenue: 0,
        bookings: 0,
      }, {
        grossBookingValue: row.grossAmount,
        netRevenue: row.netRevenue,
        bookings: 1,
      });
      addToBucket(typeBuckets, row.propertyType, {
        propertyType: row.propertyType,
        grossBookingValue: 0,
        netRevenue: 0,
        bookings: 0,
      }, {
        grossBookingValue: row.grossAmount,
        netRevenue: row.netRevenue,
        bookings: 1,
      });
    });

    const payoutLogs = await prisma.auditLog.findMany({
      where: {
        action: "HOST_PAYOUT_PAID",
        entity: "HOST_PAYOUT",
        entityId: { in: settlementByHost.map((row) => row.hostId) },
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true, displayName: true } } },
    });
    const payoutLogByHost = new Map<string, (typeof payoutLogs)[number]>();
    payoutLogs.forEach((log) => {
      if (log.entityId && !payoutLogByHost.has(log.entityId)) {
        payoutLogByHost.set(log.entityId, log);
      }
    });

    return {
      generatedAt: new Date().toISOString(),
      period: monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      summary: {
        grossBookingValue: sum((row) => row.grossAmount),
        netRevenue: sum((row) => row.netRevenue),
        pendingPayout: sum((row) => row.hostPayout),
        commissionReceivable: sum((row) => row.commissionReceivable),
        totalRefund: sum((row) => row.refundAmount),
        disputedBookings: disputeRows.length,
        waitingSettlementBookings: rows.filter((row) => row.payoutStatus === "WAITING_SETTLEMENT").length,
        readyBookings: readyRows.length,
        cancellationRate: rows.length ? Math.round((rows.filter((row) => row.status === BookingStatus.CANCELLED).length / rows.length) * 1000) / 10 : 0,
        refundRate: rows.length ? Math.round((refundRows.length / rows.length) * 1000) / 10 : 0,
      },
      charts: {
        monthly: Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
        byProvince: Array.from(provinceBuckets.values()).sort((a, b) => b.grossBookingValue - a.grossBookingValue),
        byPropertyType: Array.from(typeBuckets.values()).sort((a, b) => b.grossBookingValue - a.grossBookingValue),
      },
      settlements: settlementByHost,
      bookingDetails: rows,
      refunds: refundRows,
      disputes: disputeRows,
      payouts: settlementByHost.filter((row) => row.hostPayout > 0 || row.commissionReceivable > 0).map((row) => {
        const paidLog = payoutLogByHost.get(row.hostId);
        return {
          hostId: row.hostId,
          hostName: row.hostName,
          period: row.period,
          bookingCount: row.bookingCount,
          amount: row.hostPayout,
          commissionReceivable: row.commissionReceivable,
          status: paidLog ? "PAID" : row.status === "READY_FOR_PAYOUT" ? "READY" : "PENDING",
          paidAt: paidLog?.createdAt.toISOString() ?? null,
          paidBy: paidLog?.user?.displayName ?? paidLog?.user?.name ?? paidLog?.user?.email ?? null,
        };
      }),
    };
  },

  async markHostPayoutPaid(input: {
    adminId: string | null;
    hostId: string;
    period: string;
    amount: number;
    bookingCount: number;
    commissionReceivable: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const host = await tx.user.findFirst({
        where: { id: input.hostId, role: "HOST" },
        select: { id: true, email: true, displayName: true, name: true },
      });

      if (!host) return { kind: "HOST_NOT_FOUND" as const };

      const auditLog = await tx.auditLog.create({
        data: {
          userId: input.adminId,
          action: "HOST_PAYOUT_PAID",
          entity: "HOST_PAYOUT",
          entityId: host.id,
          newValue: {
            hostId: host.id,
            hostName: host.displayName ?? host.name ?? host.email,
            period: input.period,
            amount: Math.round(input.amount),
            bookingCount: input.bookingCount,
            commissionReceivable: Math.round(input.commissionReceivable),
          },
        },
        include: { user: { select: { email: true, name: true, displayName: true } } },
      });

      const paidBy = auditLog.user?.displayName ?? auditLog.user?.name ?? auditLog.user?.email ?? null;
      const settlementHost = await tx.settlementHost.findFirst({
        where: { hostId: host.id, period: input.period },
        select: { id: true, settlementId: true },
      });
      if (settlementHost) {
        await tx.settlementHost.update({
          where: { id: settlementHost.id },
          data: {
            status: "PAID_OUT",
            paidAt: auditLog.createdAt,
            paidBy,
          },
        });
        await tx.payoutTransaction.upsert({
          where: { settlementHostId: settlementHost.id },
          create: {
            settlementId: settlementHost.settlementId,
            settlementHostId: settlementHost.id,
            hostId: host.id,
            period: input.period,
            bookingCount: input.bookingCount,
            amount: Math.round(input.amount),
            commissionReceivable: Math.round(input.commissionReceivable),
            status: "PAID",
            paidAt: auditLog.createdAt,
            paidBy,
          },
          update: {
            status: "PAID",
            paidAt: auditLog.createdAt,
            paidBy,
            bookingCount: input.bookingCount,
            amount: Math.round(input.amount),
            commissionReceivable: Math.round(input.commissionReceivable),
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: host.id,
          type: "SYSTEM",
          title: "TripNest đã thanh toán kỳ đối soát",
          message: `TripNest đã ghi nhận thanh toán ${input.amount.toLocaleString("vi-VN")} đ cho kỳ ${input.period}.`,
          metadata: {
            action: "HOST_PAYOUT_PAID",
            period: input.period,
            amount: Math.round(input.amount),
            bookingCount: input.bookingCount,
            commissionReceivable: Math.round(input.commissionReceivable),
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          hostId: host.id,
          status: "PAID",
          paidAt: auditLog.createdAt.toISOString(),
          paidBy,
        },
      };
    });
  },

  async generateMonthlySettlement(input: {
    adminId: string | null;
    period: string;
    force?: boolean;
  }) {
    const existing = await prisma.settlementRun.findUnique({ where: { period: input.period } });
    if (existing && !input.force) {
      const snapshot = await this.getSettlementSnapshot(input.period);
      return { kind: "ALREADY_EXISTS" as const, data: snapshot };
    }

    const live = await this.getRevenueManagement(input.period, { ignoreSnapshot: true });
    const periodRows = (live.bookingDetails as RevenueBookingRow[]).filter((row) => row.settlementPeriod === input.period);
    const payload = buildRevenuePayloadFromRows({
      rows: periodRows,
      period: input.period,
      generatedAt: new Date().toISOString(),
    });

    const saved = await prisma.$transaction(async (tx) => {
      if (existing && input.force) {
        await tx.settlementRun.delete({ where: { id: existing.id } });
      }

      const settlement = await tx.settlementRun.create({
        data: {
          period: input.period,
          status: payload.summary.disputedBookings > 0 ? "PENDING_SETTLEMENT" : "READY_FOR_PAYOUT",
          generatedBy: input.adminId,
          summary: payload.summary,
          charts: payload.charts,
          notes: "Monthly settlement snapshot generated from eligible booking, refund, dispute and payout data.",
        },
      });

      for (const host of payload.settlements) {
        const hostSnapshot = await tx.settlementHost.create({
          data: {
            settlementId: settlement.id,
            hostId: host.hostId,
            hostName: host.hostName,
            hostEmail: host.hostEmail,
            period: input.period,
            bookingCount: host.bookingCount,
            grossAmount: host.grossAmount,
            refundAmount: host.refundAmount,
            disputeCount: host.disputeCount,
            commission: host.commission,
            adjustment: host.adjustment,
            hostPayout: host.hostPayout,
            commissionReceivable: host.commissionReceivable,
            status: host.status,
          },
        });

        const hostRows = periodRows.filter((row) => row.hostId === host.hostId);
        if (hostRows.length) {
          await tx.settlementBooking.createMany({
            data: hostRows.map((row) => ({
              settlementId: settlement.id,
              settlementHostId: hostSnapshot.id,
              bookingId: row.id,
              code: row.code,
              hostId: row.hostId,
              hostName: row.hostName,
              hostEmail: row.hostEmail,
              guest: row.guest,
              guestEmail: row.guestEmail,
              property: row.property,
              province: row.province,
              propertyType: row.propertyType,
              checkIn: row.checkIn || null,
              checkOut: row.checkOut || null,
              createdAtSnapshot: new Date(row.createdAt),
              settlementPeriod: row.settlementPeriod,
              grossAmount: row.grossAmount,
              settlementBase: row.settlementBase,
              refundAmount: row.refundAmount,
              penaltyAmount: row.penaltyAmount,
              commissionRate: row.commissionRate,
              commission: row.commission,
              netRevenue: row.netRevenue,
              transferReceived: row.transferReceived,
              hostDirectReceived: row.hostDirectReceived,
              hostPayout: row.hostPayout,
              commissionReceivable: row.commissionReceivable,
              adjustment: row.adjustment,
              bookingStatus: row.status,
              refundStatus: row.refundStatus,
              refundedAt: row.refundedAt ? new Date(row.refundedAt) : null,
              paymentMethod: row.paymentMethod,
              paymentMethodLabel: row.paymentMethodLabel,
              paymentModel: row.paymentModel,
              paymentStatus: row.paymentStatus,
              payoutStatus: row.payoutStatus,
              disputeStatus: row.disputeStatus,
              disputeSubject: row.disputeSubject,
            })),
          });
        }

        if (host.hostPayout > 0 || host.commissionReceivable > 0) {
          await tx.payoutTransaction.create({
            data: {
              settlementId: settlement.id,
              settlementHostId: hostSnapshot.id,
              hostId: host.hostId,
              period: input.period,
              bookingCount: host.bookingCount,
              amount: host.hostPayout,
              commissionReceivable: host.commissionReceivable,
              status: host.status === "READY_FOR_PAYOUT" ? "READY" : "PENDING",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: input.adminId,
          action: existing && input.force ? "SETTLEMENT_REGENERATED" : "SETTLEMENT_GENERATED",
          entity: "SETTLEMENT",
          entityId: settlement.id,
          newValue: {
            period: input.period,
            bookingCount: periodRows.length,
            hostCount: payload.settlements.length,
            summary: payload.summary,
          },
        },
      });

      return settlement;
    });

    const snapshot = await this.getSettlementSnapshot(saved.period);
    return { kind: "SUCCESS" as const, data: snapshot };
  },

  async listAdminPromotions() {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

    return promotions.map((p) => {
      const now = new Date();
      const expired = p.endDate < now;
      const status = !p.isActive ? "Tạm dừng" : expired ? "Đã kết thúc" : "Đang chạy";
      const value = p.discountType === "PERCENTAGE"
        ? `${p.discountValue.toNumber()}%`
        : formatVND(p.discountValue.toNumber());
      const uses = p.maxUses != null
        ? `${p.usedCount} / ${p.maxUses}`
        : `${p.usedCount} / Không giới hạn`;
      const startVN = p.startDate.toLocaleDateString("vi-VN");
      const endVN = p.endDate.toLocaleDateString("vi-VN");

      return { code: p.code, value, uses, period: `${startVN}–${endVN}`, status };
    });
  },

  async listSystemPromotions() {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

    return promotions
      .filter((promotion) => parseVoucherMetadata(promotion.description)?.kind === "SYSTEM_VOUCHER")
      .map((promotion) => {
        const metadata = parseVoucherMetadata(promotion.description);
        const expired = promotion.endDate < new Date();
        const isFull = promotion.maxUses !== null && promotion.usedCount >= promotion.maxUses;

        return {
          id: promotion.id,
          code: promotion.code,
          description: metadata?.voucherType ?? "Voucher hệ thống",
          discountType: promotion.discountType,
          discountValue: promotion.discountValue.toNumber(),
          usedCount: promotion.usedCount,
          maxUses: promotion.maxUses,
          startDate: promotion.startDate.toISOString().slice(0, 10),
          endDate: promotion.endDate.toISOString().slice(0, 10),
          conditions: metadata?.conditions ?? [],
          isActive: promotion.isActive,
          status: expired ? "EXPIRED" : isFull ? "FULL" : promotion.isActive ? "ACTIVE" : "INACTIVE",
        };
      });
  },

  async createSystemPromotion(input: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    quantity: number;
    expiresAt: Date;
    voucherType: string;
    conditions: Array<"MIN_ORDER_500K" | "MIN_GUESTS_5">;
  }) {
    return prisma.promotion.create({
      data: {
        code: input.code,
        description: JSON.stringify({
          kind: "SYSTEM_VOUCHER",
          voucherType: input.voucherType,
          conditions: input.conditions,
        }),
        discountType: input.discountType,
        discountValue: input.discountType === DiscountType.PERCENTAGE
          ? Math.min(100, Math.round(input.discountValue))
          : Math.round(input.discountValue),
        minOrderValue: input.conditions.includes("MIN_ORDER_500K") ? 500000 : null,
        maxUses: input.quantity,
        startDate: new Date(),
        endDate: input.expiresAt,
        isActive: true,
      },
    });
  },

  async markBookingRefunded(bookingId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          userId: true,
          status: true,
          cancellationRefundAmount: true,
          refundStatus: true,
          property: { select: { title: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      const refundAmount = booking.cancellationRefundAmount?.toNumber() ?? 0;
      if (booking.status !== "CANCELLED" || refundAmount <= 0) {
        return { kind: "REFUND_NOT_REQUIRED" as const };
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          refundStatus: "REFUNDED",
          refundedAt: new Date(),
          paymentStatus: "REFUNDED",
        },
        select: {
          id: true,
          refundStatus: true,
          refundedAt: true,
          paymentStatus: true,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "SYSTEM",
          title: "Đã hoàn tiền đặt chỗ",
          message: `TripNest đã hoàn ${refundAmount.toLocaleString("vi-VN")} đ cho đơn ${booking.property?.title ?? "đặt chỗ"}.`,
          metadata: {
            bookingId,
            action: "BOOKING_REFUNDED",
            refundAmount,
          },
        },
      });

      return { kind: "SUCCESS" as const, data: updated };
    });
  },

  async listAdminCommissions() {
    const rules = await prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } });

    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      appliesTo: r.listingType ?? "Tất cả",
      rate: `${(r.rate.toNumber() * 100).toFixed(0)}%`,
      minValue: r.minBookingValue
        ? formatVND(r.minBookingValue.toNumber())
        : "Không yêu cầu",
      status: r.isActive ? "Đang áp dụng" : "Tạm dừng",
    }));
  },

  async listAdminReviews() {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        booking: {
          select: {
            property: { select: { title: true } },
            tour: { select: { title: true } },
          },
        },
      },
    });

    return reviews.map((r) => ({
      id: r.id,
      guest: r.user.email,
      item: r.booking.property?.title ?? r.booking.tour?.title ?? "—",
      rating: r.rating.toFixed(1),
      excerpt: r.comment.length > 80 ? r.comment.slice(0, 80) + "…" : r.comment,
      status: "Hiển thị",
    }));
  },

  async listAdminAuditLogs() {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } } },
    });

    return logs.map((log) => ({
      id: log.id,
      actor: log.user?.email ?? "system",
      action: log.action,
      entity: log.entity,
      time: log.createdAt.toLocaleString("vi-VN"),
    }));
  },
};
