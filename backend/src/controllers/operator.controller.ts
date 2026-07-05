import type { Request, Response } from "express";
import { operatorService } from "../services/operator.service";
import { prisma } from "../lib/prisma";

export const operatorController = {
  // ── Admin routes ─────────────────────────────────────────────────────────────

  async listOperators(_req: Request, res: Response) {
    const operators = await operatorService.listOperators();
    return res.json({ data: operators });
  },

  async createOperatorProvince(req: Request, res: Response) {
    const { email, password, phone, provinceIds } = req.body ?? {};
    if (!Array.isArray(provinceIds) || provinceIds.length === 0) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "provinceIds are required" } });
    }
    try {
      const op = await operatorService.createOperatorProvince({
        email, password, phone,
        provinceIds,
        createdBy: req.user!.id,
      });
      return res.status(201).json({ data: op });
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message === "EMAIL_TAKEN") return res.status(400).json({ error: { code: "EMAIL_TAKEN", message: "Email already in use" } });
        if (e.message === "PROVINCE_ALREADY_ASSIGNED") return res.status(400).json({ error: { code: "PROVINCE_ALREADY_ASSIGNED", message: "One or more provinces already have an operator" } });
      }
      throw e;
    }
  },

  async updateOperator(req: Request, res: Response) {
    const { phone, isActive } = req.body ?? {};
    const op = await operatorService.updateOperator(req.params.id as string, { phone, isActive });
    return res.json({ data: op });
  },

  async assignProvinces(req: Request, res: Response) {
    const { provinceIds } = req.body ?? {};
    if (!Array.isArray(provinceIds)) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "provinceIds array is required" } });
    }
    try {
      const op = await operatorService.assignProvinces(req.params.id as string, provinceIds, req.user!.id);
      return res.json({ data: op });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "PROVINCE_ALREADY_ASSIGNED") {
        return res.status(400).json({ error: { code: "PROVINCE_ALREADY_ASSIGNED", message: "One or more provinces already have an operator" } });
      }
      throw e;
    }
  },

  // ── Operator province routes ──────────────────────────────────────────────────

  async dashboard(req: Request, res: Response) {
    const role = req.user!.role;
    if (role === "OPERATOR_SUB") {
      const data = await operatorService.getSubDashboard(req.user!.id);
      return res.json({ data });
    }
    const data = await operatorService.getProvinceDashboard(req.user!.id);
    return res.json({ data });
  },

  async provinces(req: Request, res: Response) {
    const provinces = await operatorService.getOperatorProvinces(req.user!.id);
    return res.json({ data: provinces });
  },

  async listings(req: Request, res: Response) {
    let cities: string[];
    if (req.user!.role === "OPERATOR_SUB") {
      const provinces = await operatorService.getSubOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    } else {
      const provinces = await operatorService.getOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    }
    const page = Number(req.query.page ?? 1);
    const status = req.query.status as string | undefined;
    const result = await operatorService.getProvinceListings(cities, { page, ...(status && { status }) });
    return res.json({ data: result });
  },

  async payments(req: Request, res: Response) {
    let cities: string[];
    if (req.user!.role === "OPERATOR_SUB") {
      const provinces = await operatorService.getSubOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    } else {
      const provinces = await operatorService.getOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    }
    const result = await operatorService.listProvincePayments(cities);
    return res.json({ data: result });
  },

  async bookings(req: Request, res: Response) {
    let cities: string[];
    if (req.user!.role === "OPERATOR_SUB") {
      const provinces = await operatorService.getSubOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    } else {
      const provinces = await operatorService.getOperatorProvinces(req.user!.id);
      cities = provinces.map((p) => p.name);
    }
    const status = req.query.status as string | undefined;
    const data = await operatorService.listProvinceBookings(cities, status);
    return res.json({ data });
  },

  async updateBookingStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (typeof id !== "string" || !id || (status !== "CONFIRMED" && status !== "CANCELLED")) {
      return res.status(400).json({
        error: {
          code: "INVALID_BOOKING_STATUS_PAYLOAD",
          message: "Invalid booking status payload",
        },
      });
    }

    const provinces = await operatorService.getOperatorProvinces(req.user!.id);
    const result = await operatorService.updateProvinceBookingStatus({
      cities: provinces.map((p) => p.name),
      bookingId: id,
      status,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found in assigned provinces",
        },
      });
    }

    if (result.kind === "BOOKING_NOT_PENDING") {
      return res.status(409).json({
        error: {
          code: "BOOKING_NOT_PENDING",
          message: "Only pending bookings can be updated",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async updateListingStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body ?? {};
    if (!status) return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "status is required" } });

    const { prisma } = await import("../lib/prisma.js");
    const property = await prisma.property.update({
      where: { id: id as string },
      data: { status },
    });
    return res.json({ data: property });
  },

  async hostApprovals(req: Request, res: Response) {
    let provinceIds: string[];
    if (req.user!.role === "OPERATOR_SUB") {
      const provinces = await operatorService.getSubOperatorProvinces(req.user!.id);
      provinceIds = provinces.map((p) => p.id);
    } else {
      provinceIds = await operatorService.getOperatorProvinceIds(req.user!.id);
    }
    const status = req.query.status as string | undefined;
    const approvals = await operatorService.listHostApprovals(provinceIds, status);
    return res.json({ data: approvals });
  },

  async approveHost(req: Request, res: Response) {
    const { notes } = req.body ?? {};
    await operatorService.approveHost(req.params.id as string, req.user!.id, notes);
    return res.json({ data: { success: true } });
  },

  async rejectHost(req: Request, res: Response) {
    const { notes } = req.body ?? {};
    if (!notes) return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "notes (rejection reason) required" } });
    await operatorService.rejectHost(req.params.id as string, req.user!.id, notes);
    return res.json({ data: { success: true } });
  },

  async propertyChangeRequests(req: Request, res: Response) {
    const provinceIds = req.user!.role === "OPERATOR_SUB"
      ? (await operatorService.getSubOperatorProvinces(req.user!.id)).map((p) => p.id)
      : await operatorService.getOperatorProvinceIds(req.user!.id);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const requests = await prisma.$queryRaw<Array<{
      id: string;
      propertyId: string;
      hostId: string;
      provinceId: string | null;
      status: string;
      currentValues: unknown;
      requestedValues: unknown;
      reason: string;
      documents: unknown;
      createdAt: Date;
      propertyTitle: string;
      hostEmail: string;
    }>>`
      SELECT pcr.*, p."title" AS "propertyTitle", u."email" AS "hostEmail"
      FROM "PropertyChangeRequest" pcr
      JOIN "Property" p ON p."id" = pcr."propertyId"
      JOIN "User" u ON u."id" = pcr."hostId"
      WHERE pcr."provinceId" = ANY(${provinceIds})
        AND (${status ?? null}::text IS NULL OR pcr."status"::text = ${status ?? null})
      ORDER BY pcr."createdAt" DESC
    `;

    return res.json({
      data: requests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
      })),
    });
  },

  async approvePropertyChange(req: Request, res: Response) {
    const requestId = req.params.id as string;
    const provinceIds = await operatorService.getOperatorProvinceIds(req.user!.id);
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      propertyId: string;
      hostId: string;
      provinceId: string | null;
      status: string;
      requestedValues: { title?: string; location?: string; pricePerNight?: number };
    }>>`
      SELECT "id", "propertyId", "hostId", "provinceId", "status", "requestedValues"
      FROM "PropertyChangeRequest"
      WHERE "id" = ${requestId}
      LIMIT 1
    `;
    const request = rows[0];

    if (!request || !request.provinceId || !provinceIds.includes(request.provinceId)) {
      return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "Request not found" } });
    }
    if (request.status !== "PENDING" && request.status !== "UNDER_REVIEW") {
      return res.status(400).json({ error: { code: "REQUEST_ALREADY_REVIEWED", message: "Request already reviewed" } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: request.propertyId },
        data: {
          ...(request.requestedValues.title ? { title: request.requestedValues.title } : {}),
          ...(request.requestedValues.location ? { addressLine1: request.requestedValues.location } : {}),
          ...(request.requestedValues.pricePerNight ? { pricePerNight: request.requestedValues.pricePerNight } : {}),
        },
      });
      await tx.$executeRaw`
        UPDATE "PropertyChangeRequest"
        SET "status" = 'APPROVED', "reviewedBy" = ${req.user!.id}, "reviewedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${request.id}
      `;
      await tx.notification.create({
        data: {
          userId: request.hostId,
          type: "SYSTEM",
          title: "Thay đổi chỗ nghỉ đã được duyệt",
          message: "Tên, vị trí hoặc mức giá gốc của chỗ nghỉ đã được cập nhật.",
          metadata: {
            action: "PROPERTY_CHANGE_APPROVED",
            propertyId: request.propertyId,
            requestId: request.id,
          },
        },
      });
    });

    return res.json({ data: { success: true } });
  },

  async rejectPropertyChange(req: Request, res: Response) {
    const requestId = req.params.id as string;
    const { notes } = req.body ?? {};
    const provinceIds = await operatorService.getOperatorProvinceIds(req.user!.id);
    const rows = await prisma.$queryRaw<Array<{ id: string; propertyId: string; hostId: string; provinceId: string | null; status: string }>>`
      SELECT "id", "propertyId", "hostId", "provinceId", "status"
      FROM "PropertyChangeRequest"
      WHERE "id" = ${requestId}
      LIMIT 1
    `;
    const request = rows[0];

    if (!request || !request.provinceId || !provinceIds.includes(request.provinceId)) {
      return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "Request not found" } });
    }
    if (request.status !== "PENDING" && request.status !== "UNDER_REVIEW") {
      return res.status(400).json({ error: { code: "REQUEST_ALREADY_REVIEWED", message: "Request already reviewed" } });
    }

    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "PropertyChangeRequest"
        SET "status" = 'REJECTED', "reviewedBy" = ${req.user!.id}, "reviewedAt" = NOW(), "notes" = ${typeof notes === "string" ? notes : null}, "updatedAt" = NOW()
        WHERE "id" = ${request.id}
      `,
      prisma.notification.create({
        data: {
          userId: request.hostId,
          type: "SYSTEM",
          title: "Thay đổi chỗ nghỉ chưa được duyệt",
          message: typeof notes === "string" && notes.trim() ? notes.trim() : "Yêu cầu thay đổi tên, vị trí hoặc mức giá gốc chưa được duyệt.",
          metadata: {
            action: "PROPERTY_CHANGE_REJECTED",
            propertyId: request.propertyId,
            requestId: request.id,
          },
        },
      }),
    ]);

    return res.json({ data: { success: true } });
  },

  async subOperators(req: Request, res: Response) {
    const subs = await operatorService.listSubOperators(req.user!.id);
    return res.json({ data: subs });
  },

  async createSubOperator(req: Request, res: Response) {
    const { email, password, phone } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "email, password required" } });
    }
    try {
      const sub = await operatorService.createOperatorSub({
        email, password, phone, createdBy: req.user!.id,
      });
      return res.status(201).json({ data: sub });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "EMAIL_TAKEN") {
        return res.status(400).json({ error: { code: "EMAIL_TAKEN", message: "Email already in use" } });
      }
      throw e;
    }
  },

  async tasks(req: Request, res: Response) {
    const role = req.user!.role;
    const id = req.user!.id;
    let tasks;
    if (role === "OPERATOR_SUB") {
      tasks = await operatorService.listTasks(id);
    } else {
      tasks = await operatorService.listTasks(undefined, id);
    }
    return res.json({ data: tasks });
  },

  async createTask(req: Request, res: Response) {
    const { title, description, assignedTo, provinceId, entityType, entityId, dueDate } = req.body ?? {};
    if (!title || !assignedTo) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "title and assignedTo required" } });
    }
    const task = await operatorService.createTask({
      title, description, assignedTo, assignedBy: req.user!.id,
      provinceId, entityType, entityId,
      ...(dueDate && { dueDate: new Date(dueDate as string) }),
    });
    return res.status(201).json({ data: task });
  },

  async updateTask(req: Request, res: Response) {
    const { status, reportNotes, reportResult } = req.body ?? {};
    if (!status) return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "status required" } });
    try {
      const task = await operatorService.updateTaskStatus(req.params.id as string, req.user!.id, status, reportNotes, reportResult);
      return res.json({ data: task });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "FORBIDDEN") {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not your task" } });
      }
      throw e;
    }
  },

  async disputes(req: Request, res: Response) {
    let provinceIds: string[];
    if (req.user!.role === "OPERATOR_SUB") {
      const provinces = await operatorService.getSubOperatorProvinces(req.user!.id);
      provinceIds = provinces.map((p) => p.id);
    } else {
      provinceIds = await operatorService.getOperatorProvinceIds(req.user!.id);
    }
    const status = req.query.status as string | undefined;
    const disputes = await operatorService.listDisputes(provinceIds, status);
    return res.json({ data: disputes });
  },

  async resolveDispute(req: Request, res: Response) {
    const { resolution, escalate } = req.body ?? {};
    if (!resolution) return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "resolution required" } });
    const dispute = await operatorService.resolveDispute(req.params.id as string, req.user!.id, resolution, escalate);
    return res.json({ data: dispute });
  },
};
