import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

function formatOperatorNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function formatVND(amount: number): string {
  return `â‚«${amount.toLocaleString("vi-VN")}`;
}

function mapPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    UNPAID: "ChÆ°a thanh toÃ¡n",
    PAID: "ÄÃ£ thanh toÃ¡n",
    REFUNDED: "ÄÃ£ hoÃ n tiá»n",
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

function mapBookingStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Chá» duyá»‡t",
    CONFIRMED: "ÄÃ£ xÃ¡c nháº­n",
    CANCELLED: "ÄÃ£ há»§y",
    COMPLETED: "HoÃ n táº¥t",
  };
  return map[status] ?? status;
}

function buildListingChecklist(property: {
  title: string;
  description: string | null;
  addressLine1: string;
  city: string;
  pricePerNight: { toNumber(): number };
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  checkInFrom: string | null;
  checkInTo: string | null;
  checkOutFrom: string | null;
  checkOutTo: string | null;
  cancellationPolicy: string;
  images: Array<{ id: string; isPrimary: boolean }>;
  amenities: Array<{ id: string }>;
  bedrooms: Array<{ id: string }>;
  owners: Array<{ id: string }>;
  ratePlans: Array<{ id: string; isActive: boolean }>;
}) {
  const items = [
    { key: "basic", label: "ThÃ´ng tin cÆ¡ báº£n", passed: Boolean(property.title.trim() && property.description && property.description.trim().length >= 30) },
    { key: "address", label: "Äá»‹a chá»‰", passed: Boolean(property.addressLine1.trim() && property.city.trim()) },
    { key: "photos", label: "áº¢nh chá»— nghá»‰", passed: property.images.length >= 3 && property.images.some((img) => img.isPrimary) },
    { key: "pricing", label: "GiÃ¡ & gÃ³i giÃ¡", passed: property.pricePerNight.toNumber() > 0 && property.ratePlans.some((plan) => plan.isActive) },
    { key: "capacity", label: "Sá»©c chá»©a", passed: property.maxGuests > 0 && property.bedroomCount >= 0 && property.bathrooms > 0 && property.bedrooms.length > 0 },
    { key: "policies", label: "ChÃ­nh sÃ¡ch lÆ°u trÃº", passed: Boolean(property.cancellationPolicy && property.checkInFrom && property.checkOutTo) },
    { key: "amenities", label: "Tiá»‡n nghi", passed: property.amenities.length >= 3 },
    { key: "legal", label: "ThÃ´ng tin chá»§ sá»Ÿ há»¯u", passed: property.owners.length > 0 },
  ];
  const passed = items.filter((item) => item.passed).length;
  return {
    items,
    passed,
    total: items.length,
    score: Math.round((passed / items.length) * 100),
    blockingIssues: items.filter((item) => !item.passed).map((item) => item.label),
  };
}

async function getNextOperatorCredential() {
  const operators = await prisma.user.findMany({
    where: { email: { startsWith: "operator", endsWith: "@tripnest.vn" } },
    select: { email: true },
  });

  const usedNumbers = new Set(
    operators
      .map((operator) => operator.email.match(/^operator(\d{2})@tripnest\.vn$/)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value))
  );

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;

  const id = formatOperatorNumber(nextNumber);
  return {
    id,
    email: `operator${id}@tripnest.vn`,
    password: `operator${id}`,
  };
}

export const operatorService = {
  // â”€â”€ Admin: quáº£n lÃ½ Operator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listOperators() {
    return prisma.user.findMany({
      where: { role: { in: ["OPERATOR_PROVINCE", "OPERATOR_SUB"] } },
      select: {
        id: true, email: true, phone: true, role: true,
        isActive: true, createdAt: true, createdById: true,
        createdByAdmin: { select: { email: true } },
        operatorAssignments: {
          include: { province: { select: { id: true, name: true, code: true, type: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async createOperatorProvince(data: {
    email?: string;
    password?: string;
    phone?: string;
    provinceIds: string[];
    createdBy: string;
  }) {
    const credential = data.email && data.password
      ? { email: data.email.trim().toLowerCase(), password: data.password }
      : await getNextOperatorCredential();
    const email = credential.email;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("EMAIL_TAKEN");

    // Kiá»ƒm tra tá»‰nh chÆ°a cÃ³ operator
    const occupied = await prisma.operatorProvinceAssignment.findFirst({
      where: { provinceId: { in: data.provinceIds } },
    });
    if (occupied) throw new Error("PROVINCE_ALREADY_ASSIGNED");

    const hashed = await bcrypt.hash(credential.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        phone: data.phone ?? null,
        role: "OPERATOR_PROVINCE",
        emailVerified: true,
        createdById: data.createdBy,
      },
    });

    await prisma.operatorProvinceAssignment.createMany({
      data: data.provinceIds.map((provinceId) => ({
        operatorId: user.id,
        provinceId,
        assignedBy: data.createdBy,
      })),
    });

    return user;
  },

  async createOperatorSub(data: {
    email: string;
    password: string;
    phone?: string;
    createdBy: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("EMAIL_TAKEN");

    const creator = await prisma.user.findUnique({ where: { id: data.createdBy } });
    if (!creator || creator.role !== "OPERATOR_PROVINCE") throw new Error("UNAUTHORIZED");

    const hashed = await bcrypt.hash(data.password, 12);
    return prisma.user.create({
      data: {
        email,
        password: hashed,
        phone: data.phone ?? null,
        role: "OPERATOR_SUB",
        emailVerified: true,
        createdById: data.createdBy,
      },
    });
  },

  async updateOperator(id: string, data: Partial<{ phone: string; isActive: boolean }>) {
    return prisma.user.update({ where: { id }, data });
  },

  async assignProvinces(operatorId: string, provinceIds: string[], assignedBy: string) {
    const occupied = await prisma.operatorProvinceAssignment.findFirst({
      where: {
        provinceId: { in: provinceIds },
        operatorId: { not: operatorId },
      },
    });
    if (occupied) throw new Error("PROVINCE_ALREADY_ASSIGNED");

    await prisma.operatorProvinceAssignment.deleteMany({ where: { operatorId } });
    await prisma.operatorProvinceAssignment.createMany({
      data: provinceIds.map((provinceId) => ({ operatorId, provinceId, assignedBy })),
    });

    return prisma.user.findUnique({
      where: { id: operatorId },
      include: { operatorAssignments: { include: { province: true } } },
    });
  },

  // â”€â”€ Operator tá»‰nh: láº¥y tá»‰nh mÃ¬nh quáº£n lÃ½ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getOperatorProvinces(operatorId: string) {
    const assignments = await prisma.operatorProvinceAssignment.findMany({
      where: { operatorId },
      include: { province: true },
    });
    return assignments.map((a) => a.province);
  },

  async getOperatorProvinceIds(operatorId: string) {
    const assignments = await prisma.operatorProvinceAssignment.findMany({
      where: { operatorId },
      select: { provinceId: true },
    });
    return assignments.map((a) => a.provinceId);
  },

  // â”€â”€ Láº¥y tá»‰nh cá»§a Operator con (qua parent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getSubOperatorProvinces(subOperatorId: string) {
    const sub = await prisma.user.findUnique({ where: { id: subOperatorId } });
    if (!sub?.createdById) return [];
    return this.getOperatorProvinces(sub.createdById);
  },

  // â”€â”€ Dashboard operator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getProvinceDashboard(operatorId: string) {
    const provinces = await this.getOperatorProvinces(operatorId);
    const cities = provinces.map((p) => p.name);

    const [totalListings, pendingListings, pendingApprovals, openDisputes, activeTasks, pendingBookings] =
      await Promise.all([
        prisma.property.count({ where: { city: { in: cities } } }),
        prisma.property.count({ where: { city: { in: cities }, status: "PENDING" } }),
        prisma.hostApprovalRequest.count({ where: { provinceId: { in: provinces.map((p) => p.id) }, status: "PENDING" } }),
        prisma.dispute.count({ where: { provinceId: { in: provinces.map((p) => p.id) }, status: { in: ["OPEN", "INVESTIGATING"] } } }),
        prisma.operatorTask.count({ where: { assignedTo: operatorId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
        prisma.booking.count({
          where: {
            status: "PENDING",
            property: { city: { in: cities } },
          },
        }),
      ]);

    return {
      provinces,
      stats: { totalListings, pendingListings, pendingApprovals, openDisputes, activeTasks, pendingBookings },
    };
  },

  async getSubDashboard(subOperatorId: string) {
    const [activeTasks, completedThisMonth, totalCompleted] = await Promise.all([
      prisma.operatorTask.count({
        where: { assignedTo: subOperatorId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.operatorTask.count({
        where: {
          assignedTo: subOperatorId,
          status: "COMPLETED",
          completedAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      prisma.operatorTask.count({ where: { assignedTo: subOperatorId, status: "COMPLETED" } }),
    ]);

    return { stats: { activeTasks, completedThisMonth, totalCompleted } };
  },

  // â”€â”€ Listings trong tá»‰nh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getProvinceListings(cities: string[], filters: { status?: string; page?: number } = {}) {
    const page = filters.page ?? 1;
    const take = 20;
    const where = {
      city: { in: cities },
      ...(filters.status && { status: filters.status as never }),
    };

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          host: { select: { id: true, email: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { id: "asc" }], select: { id: true, url: true, isPrimary: true } },
          amenities: { select: { id: true } },
          bedrooms: { select: { id: true } },
          owners: { select: { id: true } },
          ratePlans: { select: { id: true, isActive: true } },
          approvalReviews: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { reviewer: { select: { email: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.property.count({ where }),
    ]);

    return {
      items: items.map((property) => {
        const approvalChecklist = buildListingChecklist(property);
        const latestApprovalReview = property.approvalReviews[0] ?? null;
        return {
          id: property.id,
          title: property.title,
          description: property.description,
          addressLine1: property.addressLine1,
          city: property.city,
          country: property.country,
          status: property.status,
          type: property.type,
          pricePerNight: property.pricePerNight.toNumber(),
          maxGuests: property.maxGuests,
          bedroomCount: property.bedroomCount,
          bathrooms: property.bathrooms,
          bookingMethod: property.bookingMethod,
          cancellationPolicy: property.cancellationPolicy,
          breakfastIncluded: property.breakfastIncluded,
          parkingType: property.parkingType,
          petsPolicy: property.petsPolicy,
          smokingAllowed: property.smokingAllowed,
          partiesAllowed: property.partiesAllowed,
          legalEntityType: property.legalEntityType,
          host: property.host,
          images: property.images.map((image) => ({ url: image.url })),
          createdAt: property.createdAt.toISOString(),
          approvalChecklist,
          latestApprovalReview: latestApprovalReview
            ? {
                id: latestApprovalReview.id,
                decision: latestApprovalReview.decision,
                notes: latestApprovalReview.notes,
                checklist: latestApprovalReview.checklist,
                issues: latestApprovalReview.issues,
                createdAt: latestApprovalReview.createdAt.toISOString(),
                reviewer: latestApprovalReview.reviewer,
              }
            : null,
          approvalHistory: property.approvalReviews.map((review) => ({
            id: review.id,
            decision: review.decision,
            notes: review.notes,
            checklist: review.checklist,
            issues: review.issues,
            createdAt: review.createdAt.toISOString(),
            reviewer: review.reviewer,
          })),
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / take),
    };
  },

  async reviewProvinceListing(input: {
    cities: string[];
    propertyId: string;
    reviewerId: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
    notes?: string | null;
    checklist?: unknown;
    issues?: unknown;
  }) {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, city: { in: input.cities } },
      include: {
        host: { select: { id: true, email: true } },
        images: { select: { id: true, isPrimary: true } },
        amenities: { select: { id: true } },
        bedrooms: { select: { id: true } },
        owners: { select: { id: true } },
        ratePlans: { select: { id: true, isActive: true } },
      },
    });
    if (!property) return { kind: "LISTING_NOT_FOUND" as const };

    const checklist = input.checklist ?? buildListingChecklist(property);
    const decision =
      input.status === "ACTIVE" ? "APPROVED"
        : input.status === "PENDING" ? "UNDER_REVIEW"
          : "REJECTED";

    if ((input.status === "INACTIVE" || input.status === "SUSPENDED") && !input.notes?.trim()) {
      return { kind: "NOTES_REQUIRED" as const };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const propertyUpdate = await tx.property.update({
        where: { id: property.id },
        data: { status: input.status },
        select: { id: true, title: true, status: true, updatedAt: true },
      });

      await tx.listingApprovalReview.create({
        data: {
          propertyId: property.id,
          reviewerId: input.reviewerId,
          decision,
          checklist: checklist as never,
          issues: (input.issues ?? []) as never,
          notes: input.notes?.trim() || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: input.status === "ACTIVE" ? "LISTING_APPROVED" : "LISTING_REJECTED",
          title: input.status === "ACTIVE" ? "Chá»— nghá»‰ Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t" : "Chá»— nghá»‰ cáº§n chá»‰nh sá»­a",
          message: input.status === "ACTIVE"
            ? `${property.title} Ä‘Ã£ Ä‘Æ°á»£c má»Ÿ bÃ¡n trÃªn TripNest.`
            : `${property.title} chÆ°a Ä‘Æ°á»£c má»Ÿ bÃ¡n. ${input.notes?.trim() ?? "Vui lÃ²ng kiá»ƒm tra ghi chÃº duyá»‡t."}`,
          metadata: { propertyId: property.id, status: input.status, action: "LISTING_REVIEWED" },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.reviewerId,
          action: "LISTING_REVIEWED",
          entity: "Property",
          entityId: property.id,
          oldValue: { status: property.status },
          newValue: { status: input.status, notes: input.notes ?? null },
        },
      });

      return propertyUpdate;
    });

    return { kind: "SUCCESS" as const, data: { id: updated.id, title: updated.title, status: updated.status, updatedAt: updated.updatedAt.toISOString() } };
  },

  async listProvincePayments(cities: string[]) {
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          property: { city: { in: cities } },
        },
      },
      include: {
        booking: {
          include: {
            user: { select: { email: true } },
            property: { select: { title: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const paidTotal = payments
      .filter((payment) => payment.status === "PAID")
      .reduce((total, payment) => total + payment.amount.toNumber(), 0);

    return {
      total: payments.length,
      paidTotal: formatVND(paidTotal),
      items: payments.map((payment) => {
        const listing = payment.booking.property;
        return {
          id: `PM-${payment.id.slice(-6).toUpperCase()}`,
          fullId: payment.id,
          booking: `BK-${payment.booking.id.slice(-8).toUpperCase()}`,
          guest: payment.booking.user.email,
          listing: listing?.title ?? "-",
          province: listing?.city ?? "-",
          method: mapPaymentMethod(payment.method),
          amount: formatVND(payment.amount.toNumber()),
          status: mapPaymentStatus(payment.status),
          rawStatus: payment.status,
          paidAt: payment.paidAt ? payment.paidAt.toLocaleDateString("vi-VN") : "-",
        };
      }),
    };
  },

  async listProvinceBookings(cities: string[], status?: string) {
    const bookings = await prisma.booking.findMany({
      where: {
        ...(status && { status: status as never }),
        property: { city: { in: cities } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true, phone: true } },
        property: { select: { title: true, city: true } },
        payment: { select: { method: true, status: true } },
      },
    });

    return bookings.map((booking) => {
      const listing = booking.property;
      let dateRange = "";
      if (booking.checkIn && booking.checkOut) {
        const checkIn = booking.checkIn.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        const checkOut = booking.checkOut.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        dateRange = `${checkIn}-${checkOut}`;
      }

      return {
        id: `BK-${booking.id.slice(-8).toUpperCase()}`,
        fullId: booking.id,
        guest: booking.user.email,
        guestName: booking.user.name,
        guestPhone: booking.user.phone,
        item: listing?.title ?? "-",
        province: listing?.city ?? "-",
        type: booking.type,
        date: dateRange,
        guests: booking.numGuests,
        amount: formatVND(booking.totalPrice.toNumber()),
        status: mapBookingStatus(booking.status),
        rawStatus: booking.status,
        paymentMethod: booking.payment ? mapPaymentMethod(booking.payment.method) : "-",
        paymentStatus: booking.payment ? mapPaymentStatus(booking.payment.status) : "-",
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
      };
    });
  },

  async updateProvinceBookingStatus(input: {
    cities: string[];
    bookingId: string;
    status: "CONFIRMED" | "CANCELLED";
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          OR: [
            { property: { city: { in: input.cities } } },
          ],
        },
        select: {
          id: true,
          status: true,
          userId: true,
          property: { select: { title: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "PENDING") return { kind: "BOOKING_NOT_PENDING" as const };

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status },
        select: { id: true, status: true, updatedAt: true },
      });

      const itemTitle = booking.property?.title ?? "Ä‘Æ¡n Ä‘áº·t phÃ²ng";
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: input.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED",
          title: input.status === "CONFIRMED" ? "Äáº·t phÃ²ng thÃ nh cÃ´ng" : "Äáº·t phÃ²ng Ä‘Ã£ bá»‹ há»§y",
          message:
            input.status === "CONFIRMED"
              ? `ÄÆ¡n Ä‘áº·t ${itemTitle} cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n.`
              : `ÄÆ¡n Ä‘áº·t ${itemTitle} cá»§a báº¡n Ä‘Ã£ bá»‹ há»§y.`,
          metadata: {
            bookingId: booking.id,
            action: input.status === "CONFIRMED" ? "BOOKING_APPROVED" : "BOOKING_CANCELLED",
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    });
  },

  // â”€â”€ Host approval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listHostApprovals(provinceIds: string[], status?: string) {
    return prisma.hostApprovalRequest.findMany({
      where: {
        provinceId: { in: provinceIds },
        ...(status && { status: status as never }),
      },
      include: {
        user: { select: { id: true, email: true, phone: true, createdAt: true } },
        province: { select: { name: true } },
        reviewer: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async approveHost(requestId: string, reviewedBy: string, notes?: string) {
    const request = await prisma.hostApprovalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("NOT_FOUND");

    await prisma.$transaction([
      prisma.hostApprovalRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedBy, reviewedAt: new Date(), notes: notes ?? null },
      }),
      prisma.user.update({ where: { id: request.userId }, data: { role: "HOST" } }),
    ]);
  },

  async rejectHost(requestId: string, reviewedBy: string, notes: string) {
    return prisma.hostApprovalRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy, reviewedAt: new Date(), notes },
    });
  },

  // â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listTasks(assignedTo?: string, assignedBy?: string, provinceId?: string) {
    return prisma.operatorTask.findMany({
      where: {
        ...(assignedTo && { assignedTo }),
        ...(assignedBy && { assignedBy }),
        ...(provinceId && { provinceId }),
      },
      include: {
        assignee: { select: { email: true } },
        assigner: { select: { email: true } },
        province: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async createTask(data: {
    title: string;
    description?: string;
    assignedTo: string;
    assignedBy: string;
    provinceId?: string;
    entityType?: string;
    entityId?: string;
    dueDate?: Date;
  }) {
    return prisma.operatorTask.create({ data });
  },

  async updateTaskStatus(
    taskId: string,
    userId: string,
    status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
    reportNotes?: string,
    reportResult?: string
  ) {
    const task = await prisma.operatorTask.findUnique({ where: { id: taskId } });
    if (!task || task.assignedTo !== userId) throw new Error("FORBIDDEN");

    return prisma.operatorTask.update({
      where: { id: taskId },
      data: {
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() }),
        ...(reportNotes && { reportNotes }),
        ...(reportResult && { reportResult }),
      },
    });
  },

  // â”€â”€ Sub-operators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listSubOperators(createdById: string) {
    return prisma.user.findMany({
      where: { createdById, role: "OPERATOR_SUB" },
      select: {
        id: true, email: true, phone: true, isActive: true, createdAt: true,
        assignedTasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  // â”€â”€ Disputes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listDisputes(provinceIds: string[], status?: string) {
    return prisma.dispute.findMany({
      where: {
        OR: [{ provinceId: { in: provinceIds } }, { provinceId: null }],
        ...(status && { status: status as never }),
      },
      include: {
        host: { select: { email: true } },
        guest: { select: { email: true } },
        resolver: { select: { email: true } },
        province: { select: { name: true } },
        booking: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            checkIn: true,
            checkOut: true,
            property: { select: { id: true, title: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async resolveDispute(disputeId: string, resolvedBy: string, resolution: string, escalate = false) {
    return prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: escalate ? "ESCALATED" : "RESOLVED",
          resolvedBy,
          resolution,
          resolvedAt: new Date(),
          ...(escalate && { escalatedAt: new Date() }),
        },
      });

      if (dispute.bookingId) {
        await tx.bookingMessage.create({
          data: {
            bookingId: dispute.bookingId,
            senderRole: "SYSTEM",
            message: escalate
              ? `Support case Ä‘Ã£ Ä‘Æ°á»£c chuyá»ƒn lÃªn Admin: ${resolution}`
              : `Support case Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½: ${resolution}`,
            isReadByGuest: false,
            isReadByHost: false,
          },
        });
      }

      return dispute;
    });
  },
};

