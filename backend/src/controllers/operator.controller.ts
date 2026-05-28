import type { Request, Response } from "express";
import { operatorService } from "../services/operator.service";

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
