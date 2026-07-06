import bcrypt from "bcrypt";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

function formatOperatorNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function formatVND(amount: number): string {
  return `₫${amount.toLocaleString("vi-VN")}`;
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

function mapBookingStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Chờ duyệt",
    CONFIRMED: "Đã xác nhận",
    CANCELLED: "Đã hủy",
    COMPLETED: "Hoàn tất",
  };
  return map[status] ?? status;
}

const ACTIVE_DISPUTE_STATUSES = ["OPEN", "INVESTIGATING"] as const;

function toNumber(value: { toNumber: () => number } | number | null | undefined) {
  if (typeof value === "number") return value;
  return value?.toNumber() ?? 0;
}

function toJsonArray(value: Prisma.JsonValue | null | undefined): Prisma.JsonArray {
  return Array.isArray(value) ? value : [];
}

function appendOperatorNote(
  current: Prisma.JsonValue | null | undefined,
  note: { action: string; message?: string; by: string; status?: string; decision?: string }
) {
  return [
    ...toJsonArray(current),
    {
      ...note,
      createdAt: new Date().toISOString(),
    },
  ] as Prisma.InputJsonValue;
}

function classifyDisputeText(text: string) {
  const normalized = text.toLowerCase();
  if (/(sai|khác|khong dung|không đúng|hình|ảnh|mo ta|mô tả)/i.test(normalized)) {
    return { category: "PROPERTY_MISMATCH", severity: "HIGH" };
  }
  if (/(không nhận|khong nhan|từ chối|tu choi|không vào|khong vao)/i.test(normalized)) {
    return { category: "CHECKIN_BLOCKED", severity: "CRITICAL" };
  }
  if (/(hoàn tiền|hoan tien|refund|tiền|thanh toán|cọc)/i.test(normalized)) {
    return { category: "REFUND_PAYMENT", severity: "HIGH" };
  }
  if (/(phá|pha|hư hỏng|hu hong|vi phạm|vi pham|không đến|khong den)/i.test(normalized)) {
    return { category: "HOST_REPORT", severity: "MEDIUM" };
  }
  return { category: "OTHER", severity: "MEDIUM" };
}

function buildDisputeSla(createdAt: Date, status: string) {
  const ageHours = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 36e5));
  const dueAt = new Date(createdAt.getTime() + 24 * 36e5);
  const active = ACTIVE_DISPUTE_STATUSES.includes(status as (typeof ACTIVE_DISPUTE_STATUSES)[number]);
  return {
    ageHours,
    dueAt: dueAt.toISOString(),
    overdue: active && Date.now() > dueAt.getTime(),
    label: ageHours < 24 ? `${24 - ageHours}h còn lại` : `Trễ ${ageHours - 23}h`,
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
  // ── Admin: quản lý Operator ──────────────────────────────────────────────────

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

    // Kiểm tra tỉnh chưa có operator
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

  // ── Operator tỉnh: lấy tỉnh mình quản lý ────────────────────────────────────

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

  // ── Lấy tỉnh của Operator con (qua parent) ───────────────────────────────────

  async getSubOperatorProvinces(subOperatorId: string) {
    const sub = await prisma.user.findUnique({ where: { id: subOperatorId } });
    if (!sub?.createdById) return [];
    return this.getOperatorProvinces(sub.createdById);
  },

  // ── Dashboard operator ───────────────────────────────────────────────────────

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
            OR: [
              { property: { city: { in: cities } } },
              { tour: { city: { in: cities } } },
            ],
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

  // ── Listings trong tỉnh ──────────────────────────────────────────────────────

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
          images: { where: { isPrimary: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.property.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / take) };
  },

  async listProvincePayments(cities: string[]) {
    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          OR: [
            { property: { city: { in: cities } } },
            { tour: { city: { in: cities } } },
          ],
        },
      },
      include: {
        booking: {
          include: {
            user: { select: { email: true } },
            property: { select: { title: true, city: true } },
            tour: { select: { title: true, city: true } },
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
        const listing = payment.booking.property ?? payment.booking.tour;
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
        OR: [
          { property: { city: { in: cities } } },
          { tour: { city: { in: cities } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true, phone: true } },
        property: { select: { title: true, city: true } },
        tour: { select: { title: true, city: true } },
        payment: { select: { method: true, status: true } },
      },
    });

    return bookings.map((booking) => {
      const listing = booking.property ?? booking.tour;
      let dateRange = "";
      if (booking.checkIn && booking.checkOut) {
        const checkIn = booking.checkIn.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        const checkOut = booking.checkOut.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
        dateRange = `${checkIn}-${checkOut}`;
      } else if (booking.tourDate) {
        dateRange = booking.tourDate.toLocaleDateString("vi-VN");
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
            { tour: { city: { in: input.cities } } },
          ],
        },
        select: {
          id: true,
          status: true,
          userId: true,
          property: { select: { title: true } },
          tour: { select: { title: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "PENDING") return { kind: "BOOKING_NOT_PENDING" as const };

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status },
        select: { id: true, status: true, updatedAt: true },
      });

      const itemTitle = booking.property?.title ?? booking.tour?.title ?? "đơn đặt phòng";
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: input.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED",
          title: input.status === "CONFIRMED" ? "Đặt phòng thành công" : "Đặt phòng đã bị hủy",
          message:
            input.status === "CONFIRMED"
              ? `Đơn đặt ${itemTitle} của bạn đã được xác nhận.`
              : `Đơn đặt ${itemTitle} của bạn đã bị hủy.`,
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

  // ── Host approval ────────────────────────────────────────────────────────────

  async listHostApprovals(provinceIds: string[], status?: string) {
    return prisma.hostApprovalRequest.findMany({
      where: {
        OR: [
          { provinceId: { in: provinceIds } },
          { provinceId: null },
        ],
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

  // ── Tasks ────────────────────────────────────────────────────────────────────

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

  // ── Sub-operators ────────────────────────────────────────────────────────────

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

  // ── Disputes ─────────────────────────────────────────────────────────────────

  async listDisputes(provinceIds: string[], filters: {
    status?: string;
    category?: string;
    severity?: string;
    sort?: string;
  } = {}) {
    const statusFilter = filters.status === "ACTIVE" || !filters.status
      ? { in: ["OPEN", "INVESTIGATING"] }
      : filters.status;
    const orderBy =
      filters.sort === "oldest"
        ? { createdAt: "asc" as const }
        : filters.sort === "severity"
          ? [{ severity: "desc" as const }, { createdAt: "desc" as const }]
          : { createdAt: "desc" as const };

    const disputes = await prisma.dispute.findMany({
      where: {
        provinceId: { in: provinceIds },
        status: statusFilter as never,
        ...(filters.category && filters.category !== "ALL" ? { category: filters.category } : {}),
        ...(filters.severity && filters.severity !== "ALL" ? { severity: filters.severity } : {}),
      },
      include: {
        host: { select: { id: true, email: true, name: true, displayName: true, phone: true } },
        guest: { select: { id: true, email: true, name: true, displayName: true, phone: true } },
        resolver: { select: { id: true, email: true, name: true } },
        province: { select: { id: true, name: true } },
      },
      orderBy,
    });

    const bookingIds = disputes.map((dispute) => dispute.bookingId).filter((id): id is string => Boolean(id));
    const bookings = bookingIds.length
      ? await prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          include: {
            property: { select: { id: true, title: true, city: true, pricePerNight: true } },
            user: { select: { email: true, name: true, phone: true } },
            payment: { select: { amount: true, method: true, status: true, paidAt: true } },
          },
        })
      : [];
    const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

    const cases = disputes.map((dispute) => {
      const booking = dispute.bookingId ? bookingById.get(dispute.bookingId) : undefined;
      const sla = buildDisputeSla(dispute.createdAt, dispute.status);
      const active = ACTIVE_DISPUTE_STATUSES.includes(dispute.status as (typeof ACTIVE_DISPUTE_STATUSES)[number]);
      const grossAmount = toNumber(booking?.totalPrice);
      const refundAdjustment = toNumber(dispute.refundAdjustment);
      const payoutAdjustment = toNumber(dispute.payoutAdjustment);
      return {
        id: dispute.id,
        bookingId: dispute.bookingId,
        bookingCode: dispute.bookingId ? `BK-${dispute.bookingId.slice(-8).toUpperCase()}` : "-",
        status: dispute.status,
        reporter: dispute.reporter,
        category: dispute.category,
        severity: dispute.severity,
        subject: dispute.subject,
        description: dispute.description,
        requestedOutcome: dispute.requestedOutcome,
        evidence: dispute.evidence,
        operatorNotes: toJsonArray(dispute.operatorNotes),
        decision: dispute.decision,
        resolution: dispute.resolution,
        refundAdjustment,
        payoutAdjustment,
        createdAt: dispute.createdAt.toISOString(),
        updatedAt: dispute.updatedAt.toISOString(),
        resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
        escalatedAt: dispute.escalatedAt?.toISOString() ?? null,
        host: dispute.host,
        guest: dispute.guest,
        resolver: dispute.resolver,
        province: dispute.province,
        sla,
        booking: booking
          ? {
              id: booking.id,
              code: `BK-${booking.id.slice(-8).toUpperCase()}`,
              status: booking.status,
              statusLabel: mapBookingStatus(booking.status),
              checkIn: booking.checkIn?.toISOString() ?? null,
              checkOut: booking.checkOut?.toISOString() ?? null,
              guests: booking.numGuests,
              totalPrice: grossAmount,
              paymentStatus: booking.paymentStatus,
              paymentStatusLabel: mapPaymentStatus(booking.paymentStatus),
              paymentMethod: booking.payment?.method ?? null,
              paymentMethodLabel: booking.payment ? mapPaymentMethod(booking.payment.method) : "-",
              paidAmount: toNumber(booking.payment?.amount),
              property: booking.property
                ? {
                    id: booking.property.id,
                    title: booking.property.title,
                    city: booking.property.city,
                    pricePerNight: toNumber(booking.property.pricePerNight),
                  }
                : null,
            }
          : null,
        financialImpact: {
          grossAmount,
          settlementHold: active,
          refundAdjustment,
          payoutAdjustment,
          operatorDecisionRequired: active,
          suggestion:
            dispute.category === "REFUND_PAYMENT" || dispute.category === "CHECKIN_BLOCKED"
              ? "Kiểm tra chứng từ thanh toán, lịch sử check-in và quyết định mức hoàn tiền."
              : dispute.category === "PROPERTY_MISMATCH"
                ? "Đối chiếu ảnh, mô tả chỗ ở và yêu cầu Host phản hồi trước khi quyết định."
                : "Ghi nhận bằng chứng hai phía và cập nhật quyết định xử lý.",
        },
      };
    });

    const summary = {
      total: cases.length,
      open: cases.filter((item) => item.status === "OPEN").length,
      investigating: cases.filter((item) => item.status === "INVESTIGATING").length,
      escalated: cases.filter((item) => item.status === "ESCALATED").length,
      resolved: cases.filter((item) => item.status === "RESOLVED").length,
      overdue: cases.filter((item) => item.sla.overdue).length,
      highRisk: cases.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length,
      settlementHold: cases.filter((item) => item.financialImpact.settlementHold).length,
    };

    return { summary, cases };
  },

  async triageDispute(disputeId: string, operatorId: string, status: "OPEN" | "INVESTIGATING" | "ESCALATED", note?: string) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
    return prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status,
        ...(status === "ESCALATED" ? { escalatedAt: new Date() } : {}),
        operatorNotes: appendOperatorNote(dispute.operatorNotes, {
          action: status === "INVESTIGATING" ? "START_INVESTIGATION" : status === "ESCALATED" ? "ESCALATE" : "REOPEN",
          by: operatorId,
          status,
          ...(note?.trim() ? { message: note.trim() } : {}),
        }),
      },
    });
  },

  async resolveDispute(disputeId: string, resolvedBy: string, input: {
    resolution: string;
    decision?: string;
    refundAdjustment?: number;
    payoutAdjustment?: number;
    escalate?: boolean;
    note?: string;
  }) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
    const status = input.escalate ? "ESCALATED" : "RESOLVED";
    const refundAdjustment = Number.isFinite(input.refundAdjustment) ? Math.max(0, Number(input.refundAdjustment)) : undefined;
    const payoutAdjustment = Number.isFinite(input.payoutAdjustment) ? Number(input.payoutAdjustment) : undefined;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolvedBy,
          resolution: input.resolution.trim(),
          decision: input.decision ?? (input.escalate ? "ESCALATE_ADMIN" : "OPERATOR_DECISION"),
          resolvedAt: input.escalate ? null : new Date(),
          ...(input.escalate ? { escalatedAt: new Date() } : {}),
          ...(refundAdjustment !== undefined ? { refundAdjustment } : {}),
          ...(payoutAdjustment !== undefined ? { payoutAdjustment } : {}),
          operatorNotes: appendOperatorNote(dispute.operatorNotes, {
            action: input.escalate ? "ESCALATE_ADMIN" : "RESOLVE",
            by: resolvedBy,
            status,
            ...(input.decision ? { decision: input.decision } : {}),
            message: input.note?.trim() || input.resolution.trim(),
          }),
        },
      });

      if (!input.escalate && dispute.bookingId && refundAdjustment !== undefined && refundAdjustment > 0) {
        await tx.booking.update({
          where: { id: dispute.bookingId },
          data: {
            cancellationRefundAmount: refundAdjustment,
            refundStatus: "PENDING_OPERATOR_DECISION",
          },
        });
      }

      await tx.notification.createMany({
        data: [
          {
            userId: dispute.guestId,
            type: "SYSTEM",
            title: input.escalate ? "Tranh chấp đã được chuyển Admin" : "Tranh chấp đã có quyết định",
            message: input.resolution.trim(),
            metadata: { action: "DISPUTE_UPDATED", disputeId, bookingId: dispute.bookingId, status },
          },
          {
            userId: dispute.hostId,
            type: "SYSTEM",
            title: input.escalate ? "Tranh chấp đã được chuyển Admin" : "Tranh chấp đã có quyết định",
            message: input.resolution.trim(),
            metadata: { action: "DISPUTE_UPDATED", disputeId, bookingId: dispute.bookingId, status },
          },
        ],
      });

      return updated;
    });
  },

  inferDisputeMeta(reason: string) {
    return classifyDisputeText(reason);
  },
};
