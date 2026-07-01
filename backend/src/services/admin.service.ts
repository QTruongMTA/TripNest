import {
  BookingStatus,
  CancellationPolicy,
  ListingStatus,
  PaymentStatus,
  PropertyType,
} from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { sessionService } from "./session.service";

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Vá»«a xong";
  if (hours < 24) return `${hours} giá» trÆ°á»›c`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "HÃ´m qua" : `${days} ngÃ y trÆ°á»›c`;
}

function formatVND(amount: number): string {
  return `â‚«${amount.toLocaleString("vi-VN")}`;
}

function mapBookingStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Chá» xá»­ lÃ½",
    CONFIRMED: "ÄÃ£ xÃ¡c nháº­n",
    CANCELLED: "ÄÃ£ huá»·",
    COMPLETED: "HoÃ n táº¥t",
    CANCELLED_BY_GUEST: "KhÃ¡ch há»§y",
    CANCELLED_BY_HOST: "Chá»§ nhÃ  há»§y",
    EXPIRED: "Háº¿t háº¡n",
    NO_SHOW: "KhÃ´ng Ä‘áº¿n",
  };
  return map[status] ?? status;
}

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    UNPAID: "ChÆ°a thanh toÃ¡n",
    PAID: "ÄÃ£ thanh toÃ¡n",
    REFUNDED: "ÄÃ£ hoÃ n tiá»n",
    PENDING_PAYMENT: "Äang xá»­ lÃ½",
    FAILED: "Tháº¥t báº¡i",
    PARTIALLY_REFUNDED: "HoÃ n tiá»n má»™t pháº§n",
  };
  return map[status] ?? status;
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    CASH: "Tiá»n máº·t",
    BANK_TRANSFER: "Chuyá»ƒn khoáº£n",
    MOMO: "MoMo",
    VNPAY: "VNPay",
    ZALOPAY: "ZaloPay",
    CREDIT_CARD: "Tháº» tÃ­n dá»¥ng",
  };
  return map[method] ?? method;
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
    LOGIN: "ÄÄƒng nháº­p",
    LOGOUT: "ÄÄƒng xuáº¥t",
    REGISTER: "ÄÄƒng kÃ½",
    SEARCH: "TÃ¬m kiáº¿m",
    UPDATE_PROFILE: "Cáº­p nháº­t há»“ sÆ¡",
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
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: { userId, createdAt: createdAtFilter },
        orderBy: { createdAt: "desc" },
        include: {
          property: { select: { title: true } },
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
        activityName: "ÄÃ¡nh giÃ¡",
        place: review.booking.property?.title ?? "KhÃ´ng rÃµ",
        performedAt: review.createdAt.toISOString(),
      })),
      ...bookings.map((booking) => ({
        id: `booking-${booking.id}`,
        type: "BOOKING",
        activityName: "Äáº·t chá»— á»Ÿ",
        place: booking.property?.title ?? "KhÃ´ng rÃµ",
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
    const [totalProperties, pendingProperties, activeProperties, inactiveProperties] =
      await prisma.$transaction([
        prisma.property.count(),
        prisma.property.count({ where: { status: ListingStatus.PENDING } }),
        prisma.property.count({ where: { status: ListingStatus.ACTIVE } }),
        prisma.property.count({ where: { status: ListingStatus.INACTIVE } }),
      ]);

    return {
      total: totalProperties,
      pending: pendingProperties,
      active: activeProperties,
      inactive: inactiveProperties,
    };
  },

  async listListings() {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { id: true, email: true } },
      },
    });

    return properties
      .map((property) => ({
        id: property.id,
        kind: "PROPERTY" as const,
        title: property.title,
        owner: property.host.email,
        ownerEmail: property.host.email,
        city: property.city,
        price: property.pricePerNight.toNumber(),
        status: property.status,
        createdAt: property.createdAt.toISOString(),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  async updateListingStatus(kind: "PROPERTY", id: string, status: ListingStatus) {
    return prisma.property.update({
      where: { id },
      data: { status },
    });
  },

  async deleteListing(kind: "PROPERTY", id: string) {
    return prisma.property.delete({ where: { id } });
  },

  async getDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalUsers,
      pendingProperties,
      pendingBookings,
      totalBookingsThisMonth,
      revenueThisMonth,
      totalBookings,
      completedBookings,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.property.count({ where: { status: ListingStatus.PENDING } }),
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

    const pendingPropertyItems = await prisma.property.findMany({
      where: { status: ListingStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { host: { select: { email: true } } },
    });

    const pendingListings = pendingPropertyItems.map((p) => ({
      name: p.title, type: "Property", host: p.host.email, city: p.city, age: formatAge(p.createdAt),
    }));

    const completionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 1000) / 10
      : 0;

    return {
      metrics: {
        revenueThisMonth: revenueThisMonth._sum.amount?.toNumber() ?? 0,
        newBookingsThisMonth: totalBookingsThisMonth,
        pendingListings: pendingProperties,
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
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
        property: { select: { title: true } },
        payment: { select: { method: true } },
      },
    });

    return bookings.map((b) => {
      const item = b.property?.title ?? "â€”";
      let dateRange = "";
      if (b.checkIn && b.checkOut) {
        const ci = b.checkIn.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        const co = b.checkOut.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        dateRange = `${ci}â€“${co}`;
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
        paymentMethod: b.payment ? mapPaymentMethod(b.payment.method) : "â€”",
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
      guestEmail: p.booking.user.email,
      method: mapPaymentMethod(p.method),
      amount: formatVND(p.amount.toNumber()),
      rawStatus: p.status,
      status: mapPaymentStatus(p.status),
      paidAt: p.paidAt ? p.paidAt.toLocaleDateString("vi-VN") : "â€”",
    }));
  },

  async listAdminPromotions() {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

    return promotions.map((p) => {
      const now = new Date();
      const expired = p.endDate < now;
      const status = !p.isActive ? "Táº¡m dá»«ng" : expired ? "ÄÃ£ káº¿t thÃºc" : "Äang cháº¡y";
      const value = p.discountType === "PERCENTAGE"
        ? `${p.discountValue.toNumber()}%`
        : formatVND(p.discountValue.toNumber());
      const uses = p.maxUses != null
        ? `${p.usedCount} / ${p.maxUses}`
        : `${p.usedCount} / KhÃ´ng giá»›i háº¡n`;
      const startVN = p.startDate.toLocaleDateString("vi-VN");
      const endVN = p.endDate.toLocaleDateString("vi-VN");

      return { code: p.code, value, uses, period: `${startVN}â€“${endVN}`, status };
    });
  },

  async listAdminCommissions() {
    const rules = await prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } });

    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      appliesTo: r.listingType ?? "Táº¥t cáº£",
      rate: `${(r.rate.toNumber() * 100).toFixed(0)}%`,
      minValue: r.minBookingValue
        ? formatVND(r.minBookingValue.toNumber())
        : "KhÃ´ng yÃªu cáº§u",
      status: r.isActive ? "Äang Ã¡p dá»¥ng" : "Táº¡m dá»«ng",
    }));
  },

  async listAdminReviews() {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
        booking: {
          select: {
            property: { select: { title: true } },
          },
        },
      },
    });

    return reviews.map((r) => ({
      id: r.id,
      guest: r.user.email,
      item: r.booking.property?.title ?? "â€”",
      rating: r.rating,
      cleanliness: r.cleanliness,
      comfort: r.comfort,
      location: r.location,
      facilities: r.facilities,
      staff: r.staff,
      valueForMoney: r.valueForMoney,
      comment: r.comment,
      hostReply: r.hostReply,
      hostRepliedAt: r.hostRepliedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      images: r.images,
      user: { email: r.user.email },
      booking: {
        property: r.booking.property,
      },
      excerpt: r.comment.length > 80 ? r.comment.slice(0, 80) + "â€¦" : r.comment,
      status: "Hiá»ƒn thá»‹",
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

