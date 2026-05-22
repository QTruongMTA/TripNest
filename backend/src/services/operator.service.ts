import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

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
    email: string;
    password: string;
    phone?: string;
    provinceIds: string[];
    createdBy: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("EMAIL_TAKEN");

    // Kiểm tra tỉnh chưa có operator
    const occupied = await prisma.operatorProvinceAssignment.findFirst({
      where: { provinceId: { in: data.provinceIds } },
    });
    if (occupied) throw new Error("PROVINCE_ALREADY_ASSIGNED");

    const hashed = await bcrypt.hash(data.password, 12);
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

    const [totalListings, pendingListings, pendingApprovals, openDisputes, activeTasks] =
      await Promise.all([
        prisma.property.count({ where: { city: { in: cities } } }),
        prisma.property.count({ where: { city: { in: cities }, status: "PENDING" } }),
        prisma.hostApprovalRequest.count({ where: { provinceId: { in: provinces.map((p) => p.id) }, status: "PENDING" } }),
        prisma.dispute.count({ where: { provinceId: { in: provinces.map((p) => p.id) }, status: { in: ["OPEN", "INVESTIGATING"] } } }),
        prisma.operatorTask.count({ where: { assignedTo: operatorId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      ]);

    return {
      provinces,
      stats: { totalListings, pendingListings, pendingApprovals, openDisputes, activeTasks },
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

  // ── Host approval ────────────────────────────────────────────────────────────

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
