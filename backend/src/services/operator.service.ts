import bcrypt from "bcrypt";
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

type ListingRiskInput = {
  description?: string | null;
  addressLine1?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pricePerNight?: { toNumber(): number } | number | null;
  maxGuests: number;
  bedroomCount: number;
  bathrooms: number;
  images?: unknown[];
  owners?: unknown[];
  host?: { hostApprovalRequests?: { status: string }[] };
};

function getNumberValue(value: ListingRiskInput["pricePerNight"]) {
  if (typeof value === "number") return value;
  return value ? value.toNumber() : 0;
}

function scoreListingRisk(property: ListingRiskInput) {
  const reasons: string[] = [];
  let score = 0;

  if (!property.owners?.length && !property.host?.hostApprovalRequests?.some((request) => request.status === "APPROVED")) {
    score += 25;
    reasons.push("Hồ sơ host chưa được duyệt");
  }
  if (!property.latitude || !property.longitude) {
    score += 20;
    reasons.push("Chưa có tọa độ/map pin để đối chiếu vị trí");
  }
  if (!property.addressLine1?.trim()) {
    score += 15;
    reasons.push("Địa chỉ chi tiết còn thiếu");
  }
  if (!property.images?.length || property.images.length < 3) {
    score += 20;
    reasons.push("Ảnh cơ sở chưa đủ để đối chiếu từ xa");
  }
  if (!property.description?.trim() || property.description.trim().length < 120) {
    score += 10;
    reasons.push("Mô tả còn ngắn, khó đánh giá tính nhất quán");
  }
  if (!property.owners?.length) {
    score += 10;
    reasons.push("Chưa có thông tin chủ sở hữu/người hưởng lợi");
  }
  if (property.maxGuests >= 10 || property.bedroomCount >= 5 || getNumberValue(property.pricePerNight) >= 5000000) {
    score += 15;
    reasons.push("Cơ sở quy mô hoặc giá trị cao, nên kiểm tra kỹ hơn");
  }
  if (property.bathrooms <= 0 || property.bedroomCount <= 0) {
    score += 10;
    reasons.push("Thông tin sức chứa/phòng chưa hợp lệ");
  }

  const normalizedScore = Math.min(100, score);
  return {
    score: normalizedScore,
    level: normalizedScore >= 60 ? "HIGH" : normalizedScore >= 30 ? "MEDIUM" : "LOW",
    reasons,
  };
}

function readAuditValue(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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
          host: {
            select: {
              id: true,
              email: true,
              name: true,
              displayName: true,
              phone: true,
              address: true,
              nationality: true,
              hostApprovalRequests: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                  reviewedAt: true,
                  notes: true,
                  documents: true,
                },
              },
            },
          },
          images: { orderBy: { isPrimary: "desc" }, take: 8 },
          owners: {
            orderBy: { sortOrder: "asc" },
            select: { firstName: true, lastName: true, birthDate: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.property.count({ where }),
    ]);

    const listingIds = items.map((item) => item.id);
    const [revisionLogs, inspectionLogs, inspectionTasks] = listingIds.length
      ? await Promise.all([
          prisma.auditLog.findMany({
            where: {
              action: "LISTING_REVISION_REQUESTED",
              entity: "Property",
              entityId: { in: listingIds },
            },
            orderBy: { createdAt: "desc" },
            select: { entityId: true, createdAt: true, newValue: true },
          }),
          prisma.auditLog.findMany({
            where: {
              action: "FIELD_INSPECTION_REQUIRED",
              entity: "Property",
              entityId: { in: listingIds },
            },
            orderBy: { createdAt: "desc" },
            select: { entityId: true, createdAt: true, newValue: true },
          }),
          prisma.operatorTask.findMany({
            where: {
              entityType: "Property",
              entityId: { in: listingIds },
            },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              entityId: true,
              status: true,
              reportResult: true,
              reportNotes: true,
              dueDate: true,
              createdAt: true,
              assignee: { select: { email: true } },
            },
          }),
        ])
      : [[], [], []] as const;

    const latestRevisionByProperty = new Map<string, { createdAt: string; notes?: string; requestedItems: string[] }>();
    for (const log of revisionLogs) {
      if (!log.entityId || latestRevisionByProperty.has(log.entityId)) continue;
      const value = readAuditValue(log.newValue);
      const requestedItems = Array.isArray(value.requestedItems)
        ? value.requestedItems.filter((item): item is string => typeof item === "string")
        : [];
      const latestRevision: { createdAt: string; notes?: string; requestedItems: string[] } = {
        createdAt: log.createdAt.toISOString(),
        requestedItems,
      };
      if (typeof value.notes === "string") latestRevision.notes = value.notes;
      latestRevisionByProperty.set(log.entityId, latestRevision);
    }

    const latestInspectionLogByProperty = new Map<string, { createdAt: string; notes?: string }>();
    for (const log of inspectionLogs) {
      if (!log.entityId || latestInspectionLogByProperty.has(log.entityId)) continue;
      const value = readAuditValue(log.newValue);
      const latestInspectionLog: { createdAt: string; notes?: string } = {
        createdAt: log.createdAt.toISOString(),
      };
      if (typeof value.notes === "string") latestInspectionLog.notes = value.notes;
      latestInspectionLogByProperty.set(log.entityId, latestInspectionLog);
    }

    const latestTaskByProperty = new Map<string, (typeof inspectionTasks)[number]>();
    for (const task of inspectionTasks) {
      if (!task.entityId || latestTaskByProperty.has(task.entityId)) continue;
      latestTaskByProperty.set(task.entityId, task);
    }

    return {
      items: items.map((item) => {
        const risk = scoreListingRisk(item);
        const latestRevision = latestRevisionByProperty.get(item.id) ?? null;
        const latestInspectionLog = latestInspectionLogByProperty.get(item.id) ?? null;
        const latestInspectionTask = latestTaskByProperty.get(item.id) ?? null;
        const openInspection = latestInspectionTask && ["PENDING", "IN_PROGRESS"].includes(latestInspectionTask.status);
        const failedInspection = latestInspectionTask?.status === "COMPLETED" && latestInspectionTask.reportResult === "FAIL";
        const verificationStatus =
          item.status === "ACTIVE"
            ? "APPROVED"
            : item.status === "INACTIVE"
              ? "REJECTED"
              : item.status === "SUSPENDED"
                ? "SUSPENDED"
                : openInspection
                  ? "FIELD_INSPECTION_REQUIRED"
                  : failedInspection
                    ? "FIELD_INSPECTION_FAILED"
                    : latestRevision
                      ? "NEEDS_MORE_INFO"
                      : risk.level === "HIGH"
                        ? "HIGH_RISK_REVIEW"
                        : "PENDING_REVIEW";

        return {
          ...item,
          verificationStatus,
          riskScore: risk.score,
          riskLevel: risk.level,
          riskReasons: risk.reasons,
          latestRevisionRequest: latestRevision,
          latestFieldInspection: latestInspectionTask
            ? {
                id: latestInspectionTask.id,
                status: latestInspectionTask.status,
                reportResult: latestInspectionTask.reportResult,
                reportNotes: latestInspectionTask.reportNotes,
                dueDate: latestInspectionTask.dueDate?.toISOString() ?? null,
                createdAt: latestInspectionTask.createdAt.toISOString(),
                assigneeEmail: latestInspectionTask.assignee?.email ?? null,
                requestedAt: latestInspectionLog?.createdAt ?? latestInspectionTask.createdAt.toISOString(),
                notes: latestInspectionLog?.notes ?? null,
              }
            : null,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / take),
    };
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

  // ── Host approval ────────────────────────────────────────────────────────────

  async updateProvinceListingStatus(input: {
    cities: string[];
    listingId: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    reviewedBy: string;
    notes?: string;
    checklist?: Record<string, boolean>;
    evidence?: Record<string, string>;
  }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: {
          id: input.listingId,
          city: { in: input.cities },
        },
        select: {
          id: true,
          title: true,
          status: true,
          hostId: true,
          city: true,
          legalEntityType: true,
          ownerAlias: true,
          owners: {
            orderBy: { sortOrder: "asc" },
            select: { firstName: true, lastName: true, birthDate: true },
          },
          host: {
            select: {
              hostApprovalRequests: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, status: true, documents: true },
              },
            },
          },
        },
      });

      if (!property) return { kind: "LISTING_NOT_FOUND" as const };
      if (input.status !== "SUSPENDED" && property.status !== "PENDING") {
        return { kind: "LISTING_NOT_PENDING" as const };
      }
      if (input.status === "ACTIVE") {
        if (!property.owners.length) {
          return { kind: "LEGAL_INFO_INCOMPLETE" as const };
        }

        const latestInspectionTask = await tx.operatorTask.findFirst({
          where: {
            entityType: "Property",
            entityId: property.id,
          },
          orderBy: { createdAt: "desc" },
          select: { status: true, reportResult: true },
        });

        if (latestInspectionTask && ["PENDING", "IN_PROGRESS"].includes(latestInspectionTask.status)) {
          return { kind: "FIELD_INSPECTION_OPEN" as const };
        }

        if (latestInspectionTask?.status === "COMPLETED" && latestInspectionTask.reportResult === "FAIL") {
          return { kind: "FIELD_INSPECTION_FAILED" as const };
        }
      }

      if (input.status === "ACTIVE") {
        const documents = {
          source: "listing-approval",
          property: {
            id: property.id,
            title: property.title,
            city: property.city,
            legalEntityType: property.legalEntityType,
            ownerAlias: property.ownerAlias,
            owners: property.owners.map((owner) => ({
              firstName: owner.firstName,
              lastName: owner.lastName,
              birthDate: owner.birthDate.toISOString(),
            })),
          },
          checklist: input.checklist ?? null,
          checklistEvidence: input.evidence ?? null,
        };
        const latestHostApproval = property.host.hostApprovalRequests[0];

        if (latestHostApproval) {
          await tx.hostApprovalRequest.update({
            where: { id: latestHostApproval.id },
            data: {
              status: "APPROVED",
              reviewedBy: input.reviewedBy,
              reviewedAt: new Date(),
              notes: input.notes ?? "Approved during listing opening review",
              documents,
            },
          });
        } else {
          await tx.hostApprovalRequest.create({
            data: {
              userId: property.hostId,
              status: "APPROVED",
              reviewedBy: input.reviewedBy,
              reviewedAt: new Date(),
              notes: input.notes ?? "Approved during listing opening review",
              documents,
            },
          });
        }
      }

      const updated = await tx.property.update({
        where: { id: input.listingId },
        data: { status: input.status },
        select: { id: true, title: true, status: true, updatedAt: true },
      });

      const action =
        input.status === "ACTIVE"
          ? "LISTING_APPROVED"
          : input.status === "SUSPENDED"
            ? "LISTING_SUSPENDED"
            : "LISTING_REJECTED";

      await tx.auditLog.create({
        data: {
          userId: input.reviewedBy,
          action,
          entity: "Property",
          entityId: property.id,
          oldValue: { status: property.status },
          newValue: {
            status: input.status,
            notes: input.notes ?? null,
            checklist: input.checklist ?? null,
            checklistEvidence: input.evidence ?? null,
            city: property.city,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: input.status === "ACTIVE" ? "LISTING_APPROVED" : "LISTING_REJECTED",
          title:
            input.status === "ACTIVE"
              ? "Cơ sở lưu trú đã được duyệt"
              : input.status === "SUSPENDED"
                ? "Cơ sở lưu trú đã bị khóa"
                : "Cơ sở lưu trú bị từ chối",
          message:
            input.status === "ACTIVE"
              ? `${property.title} đã được duyệt và mở bán trên TripNest.`
              : input.notes
                ? `${property.title}: ${input.notes}`
                : `${property.title} cần được bổ sung thông tin trước khi mở bán.`,
          metadata: {
            propertyId: property.id,
            action,
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          title: updated.title,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    });
  },

  async requestListingRevision(input: {
    cities: string[];
    listingId: string;
    reviewedBy: string;
    notes: string;
    requestedItems: string[];
    evidence?: Record<string, string>;
  }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: {
          id: input.listingId,
          city: { in: input.cities },
        },
        select: {
          id: true,
          title: true,
          status: true,
          hostId: true,
          city: true,
        },
      });

      if (!property) return { kind: "LISTING_NOT_FOUND" as const };
      if (property.status !== "PENDING") return { kind: "LISTING_NOT_PENDING" as const };

      await tx.auditLog.create({
        data: {
          userId: input.reviewedBy,
          action: "LISTING_REVISION_REQUESTED",
          entity: "Property",
          entityId: property.id,
          oldValue: { status: property.status },
          newValue: {
            status: property.status,
            notes: input.notes,
            requestedItems: input.requestedItems,
            evidence: input.evidence ?? null,
            city: property.city,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: "SYSTEM",
          title: "Bổ sung thông tin cơ sở lưu trú",
          message: `${property.title} cần bổ sung thông tin trước khi TripNest mở bán. ${input.notes}`,
          metadata: {
            propertyId: property.id,
            action: "LISTING_REVISION_REQUESTED",
            requestedItems: input.requestedItems,
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: property.id,
          title: property.title,
          status: property.status,
          requestedItems: input.requestedItems,
        },
      };
    });
  },

  async requestFieldInspection(input: {
    cities: string[];
    listingId: string;
    reviewedBy: string;
    notes: string;
    provinceId?: string;
    dueDate?: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: {
          id: input.listingId,
          city: { in: input.cities },
        },
        select: {
          id: true,
          title: true,
          status: true,
          hostId: true,
          city: true,
        },
      });

      if (!property) return { kind: "LISTING_NOT_FOUND" as const };
      if (property.status !== "PENDING") return { kind: "LISTING_NOT_PENDING" as const };

      const openTask = await tx.operatorTask.findFirst({
        where: {
          entityType: "Property",
          entityId: property.id,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        select: { id: true },
      });

      if (openTask) return { kind: "FIELD_INSPECTION_ALREADY_OPEN" as const };

      const taskData: {
        title: string;
        description: string;
        assignedTo: string;
        assignedBy: string;
        provinceId?: string;
        entityType: string;
        entityId: string;
        dueDate?: Date;
      } = {
        title: `Kiểm tra thực địa: ${property.title}`,
        description: [
          input.notes,
          "",
          "Checklist thực địa: xác nhận địa chỉ/map pin, mặt tiền/lối vào, quyền tiếp cận của host, ảnh phòng chính và các tiện nghi trọng yếu.",
        ].join("\n"),
        assignedTo: input.reviewedBy,
        assignedBy: input.reviewedBy,
        entityType: "Property",
        entityId: property.id,
      };
      if (input.provinceId) taskData.provinceId = input.provinceId;
      if (input.dueDate) taskData.dueDate = input.dueDate;

      const task = await tx.operatorTask.create({
        data: taskData,
        select: {
          id: true,
          title: true,
          status: true,
          assignedTo: true,
          dueDate: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.reviewedBy,
          action: "FIELD_INSPECTION_REQUIRED",
          entity: "Property",
          entityId: property.id,
          oldValue: { status: property.status },
          newValue: {
            status: property.status,
            notes: input.notes,
            assignedTo: input.reviewedBy,
            taskId: task.id,
            city: property.city,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: property.hostId,
          type: "SYSTEM",
          title: "TripNest cần xác minh trực tiếp cơ sở lưu trú",
          message: `${property.title} cần được operator xác minh thực địa trước khi mở bán. ${input.notes}`,
          metadata: {
            propertyId: property.id,
            taskId: task.id,
            action: "FIELD_INSPECTION_REQUIRED",
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: task,
      };
    });
  },

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
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: "SYSTEM",
          title: "Hồ sơ host đã được duyệt",
          message: "Bạn đã được nâng quyền host. Hãy tải lại TripNest để cập nhật quyền truy cập mới.",
          metadata: { requestId, action: "HOST_APPROVED" },
        },
      }),
    ]);
  },

  async rejectHost(requestId: string, reviewedBy: string, notes: string) {
    const request = await prisma.hostApprovalRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("NOT_FOUND");

    await prisma.$transaction([
      prisma.hostApprovalRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", reviewedBy, reviewedAt: new Date(), notes },
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: "SYSTEM",
          title: "Hồ sơ host chưa được duyệt",
          message: notes || "Hồ sơ host của bạn chưa đạt yêu cầu. Vui lòng xem lại chi tiết để bổ sung.",
          metadata: { requestId, action: "HOST_REJECTED" },
        },
      }),
    ]);
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
        assignee: { select: { id: true, email: true } },
        assigner: { select: { id: true, email: true } },
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

  async listDisputes(provinceIds: string[], status?: string) {
    return prisma.dispute.findMany({
      where: {
        provinceId: { in: provinceIds },
        ...(status && { status: status as never }),
      },
      include: {
        host: { select: { email: true } },
        guest: { select: { email: true } },
        resolver: { select: { email: true } },
        province: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async resolveDispute(disputeId: string, resolvedBy: string, resolution: string, escalate = false) {
    return prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: escalate ? "ESCALATED" : "RESOLVED",
        resolvedBy,
        resolution,
        resolvedAt: new Date(),
        ...(escalate && { escalatedAt: new Date() }),
      },
    });
  },
};
