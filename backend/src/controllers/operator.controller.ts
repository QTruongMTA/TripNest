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
    const { status, notes, checklist } = req.body ?? {};

    if (typeof id !== "string" || !id || !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        error: {
          code: "INVALID_LISTING_STATUS_PAYLOAD",
          message: "Invalid listing status payload",
        },
      });
    }

    if (status === "INACTIVE" && (typeof notes !== "string" || !notes.trim())) {
      return res.status(400).json({
        error: {
          code: "REJECTION_REASON_REQUIRED",
          message: "notes is required when rejecting a listing",
        },
      });
    }

    const requiredChecks = [
      "addressInProvince",
      "photosMatch",
      "basicInfoComplete",
      "legalInfoReviewed",
      "noPolicyViolation",
    ];

    if (
      status === "ACTIVE" &&
      (!checklist ||
        typeof checklist !== "object" ||
        !requiredChecks.every((key) => checklist[key] === true) ||
        typeof notes !== "string" ||
        notes.trim().length < 20)
    ) {
      return res.status(400).json({
        error: {
          code: "APPROVAL_CHECKLIST_REQUIRED",
          message: "All approval checklist items and a short review summary are required before approving a listing",
        },
      });
    }

    const provinces = await operatorService.getOperatorProvinces(req.user!.id);
    const listingStatus = status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
    const listingReviewInput: {
      cities: string[];
      listingId: string;
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      reviewedBy: string;
      notes?: string;
      checklist?: Record<string, boolean>;
    } = {
      cities: provinces.map((p) => p.name),
      listingId: id,
      status: listingStatus,
      reviewedBy: req.user!.id,
    };

    if (typeof notes === "string" && notes.trim()) {
      listingReviewInput.notes = notes.trim();
    }

    if (checklist && typeof checklist === "object") {
      listingReviewInput.checklist = checklist as Record<string, boolean>;
    }

    const result = await operatorService.updateProvinceListingStatus(listingReviewInput);

    if (result.kind === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "LISTING_NOT_FOUND",
          message: "Listing not found in assigned provinces",
        },
      });
    }

    if (result.kind === "LISTING_NOT_PENDING") {
      return res.status(409).json({
        error: {
          code: "LISTING_NOT_PENDING",
          message: "Only pending listings can be approved or rejected",
        },
      });
    }

    if (result.kind === "LEGAL_INFO_INCOMPLETE") {
      return res.status(409).json({
        error: {
          code: "LEGAL_INFO_INCOMPLETE",
          message: "Host legal information is missing; request a revision before approving this listing",
        },
      });
    }

    if (result.kind === "FIELD_INSPECTION_OPEN") {
      return res.status(409).json({
        error: {
          code: "FIELD_INSPECTION_OPEN",
          message: "Field inspection must be completed before approving this listing",
        },
      });
    }

    if (result.kind === "FIELD_INSPECTION_FAILED") {
      return res.status(409).json({
        error: {
          code: "FIELD_INSPECTION_FAILED",
          message: "Latest field inspection failed; request revision or reject the listing",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async requestListingRevision(req: Request, res: Response) {
    const { id } = req.params;
    const { notes, requestedItems, evidence } = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_LISTING_ID",
          message: "Listing id is required",
        },
      });
    }

    if (typeof notes !== "string" || notes.trim().length < 12) {
      return res.status(400).json({
        error: {
          code: "REVISION_NOTES_REQUIRED",
          message: "Detailed revision notes are required",
        },
      });
    }

    if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.some((item) => typeof item !== "string")) {
      return res.status(400).json({
        error: {
          code: "REVISION_ITEMS_REQUIRED",
          message: "At least one requested item is required",
        },
      });
    }

    const provinces = await operatorService.getOperatorProvinces(req.user!.id);
    const revisionInput: {
      cities: string[];
      listingId: string;
      reviewedBy: string;
      notes: string;
      requestedItems: string[];
      evidence?: Record<string, string>;
    } = {
      cities: provinces.map((p) => p.name),
      listingId: id,
      reviewedBy: req.user!.id,
      notes: notes.trim(),
      requestedItems: requestedItems as string[],
    };

    if (evidence && typeof evidence === "object") {
      revisionInput.evidence = evidence as Record<string, string>;
    }

    const result = await operatorService.requestListingRevision(revisionInput);

    if (result.kind === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "LISTING_NOT_FOUND",
          message: "Listing not found in assigned provinces",
        },
      });
    }

    if (result.kind === "LISTING_NOT_PENDING") {
      return res.status(409).json({
        error: {
          code: "LISTING_NOT_PENDING",
          message: "Only pending listings can be requested for revision",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async requestFieldInspection(req: Request, res: Response) {
    const { id } = req.params;
    const { notes, dueDate } = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_LISTING_ID",
          message: "Listing id is required",
        },
      });
    }

    if (typeof notes !== "string" || notes.trim().length < 12) {
      return res.status(400).json({
        error: {
          code: "FIELD_INSPECTION_NOTES_REQUIRED",
          message: "Detailed field inspection notes are required",
        },
      });
    }

    const provinces = await operatorService.getOperatorProvinces(req.user!.id);
    const province = provinces[0];
    const fieldInspectionInput: {
      cities: string[];
      listingId: string;
      reviewedBy: string;
      notes: string;
      provinceId?: string;
      dueDate?: Date;
    } = {
      cities: provinces.map((p) => p.name),
      listingId: id,
      reviewedBy: req.user!.id,
      notes: notes.trim(),
    };

    if (province?.id) fieldInspectionInput.provinceId = province.id;
    if (typeof dueDate === "string" && dueDate) fieldInspectionInput.dueDate = new Date(dueDate);

    const result = await operatorService.requestFieldInspection(fieldInspectionInput);

    if (result.kind === "LISTING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "LISTING_NOT_FOUND",
          message: "Listing not found in assigned provinces",
        },
      });
    }

    if (result.kind === "LISTING_NOT_PENDING") {
      return res.status(409).json({
        error: {
          code: "LISTING_NOT_PENDING",
          message: "Only pending listings can be requested for field inspection",
        },
      });
    }

    if (result.kind === "FIELD_INSPECTION_ALREADY_OPEN") {
      return res.status(409).json({
        error: {
          code: "FIELD_INSPECTION_ALREADY_OPEN",
          message: "This listing already has an open field inspection task",
        },
      });
    }

    return res.status(201).json({ data: result.data });
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
    if (!title) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "title required" } });
    }
    const task = await operatorService.createTask({
      title,
      description,
      assignedTo: typeof assignedTo === "string" && assignedTo ? assignedTo : req.user!.id,
      assignedBy: req.user!.id,
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
