import type { Request, Response } from "express";
import {
  CancellationPolicy,
  DiscountType,
  ListingStatus,
  PropertyType,
  TourCategory,
} from "../generated/prisma/enums";
import { adminService } from "../services/admin.service";
import { bookingService } from "../services/booking.service";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseVoucherCode(value: unknown) {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 24);
}

function parseVoucherConditions(value: unknown) {
  const conditions = Array.isArray(value) ? value : [];
  return conditions.filter((condition): condition is "MIN_ORDER_500K" | "MIN_GUESTS_5" =>
    condition === "MIN_ORDER_500K" || condition === "MIN_GUESTS_5"
  );
}

export const adminController = {
  async users(_req: Request, res: Response) {
    const users = await adminService.listUsers();
    return res.json({ data: users });
  },

  async userDetail(req: Request, res: Response) {
    const { id } = req.params;
    if (!isNonEmptyString(id)) {
      return res.status(400).json({
        error: {
          code: "INVALID_USER_ID",
          message: "Invalid user id",
        },
      });
    }

    const filters: { from?: string; to?: string; type?: string } = {};
    if (typeof req.query.from === "string") filters.from = req.query.from;
    if (typeof req.query.to === "string") filters.to = req.query.to;
    if (typeof req.query.type === "string") filters.type = req.query.type;

    const data = await adminService.getUserDetail(id, filters);

    if (!data) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({ data });
  },

  async overview(_req: Request, res: Response) {
    const [summary, listings, hosts] = await Promise.all([
      adminService.getListingSummary(),
      adminService.listListings(),
      adminService.listHosts(),
    ]);

    return res.json({ data: { summary, listings, hosts } });
  },

  async createProperty(req: Request, res: Response) {
    const body = req.body ?? {};

    if (
      !isNonEmptyString(body.title) ||
      !isNonEmptyString(body.addressLine1) ||
      !isNonEmptyString(body.city) ||
      !isNonEmptyString(body.country) ||
      !isPositiveNumber(body.pricePerNight) ||
      !isPositiveNumber(body.maxGuests) ||
      !isPositiveNumber(body.bathrooms) ||
      !isNonEmptyString(body.hostId) ||
      !Object.values(PropertyType).includes(body.type) ||
      !Object.values(CancellationPolicy).includes(body.cancellationPolicy) ||
      (body.cleaningFee !== undefined && !isNonNegativeNumber(body.cleaningFee)) ||
      (body.bedroomCount !== undefined && !isNonNegativeNumber(body.bedroomCount))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_PAYLOAD",
          message: "Invalid property payload",
        },
      });
    }

    const property = await adminService.createProperty({
      title: body.title.trim(),
      ...(isNonEmptyString(body.description) ? { description: body.description.trim() } : {}),
      addressLine1: body.addressLine1.trim(),
      ...(isNonEmptyString(body.addressLine2) ? { addressLine2: body.addressLine2.trim() } : {}),
      city: body.city.trim(),
      ...(isNonEmptyString(body.postalCode) ? { postalCode: body.postalCode.trim() } : {}),
      country: body.country.trim(),
      pricePerNight: body.pricePerNight,
      ...(body.cleaningFee !== undefined ? { cleaningFee: body.cleaningFee } : {}),
      maxGuests: body.maxGuests,
      bedroomCount: body.bedroomCount ?? 0,
      bathrooms: body.bathrooms,
      type: body.type,
      cancellationPolicy: body.cancellationPolicy,
      hostId: body.hostId,
      ...(isNonEmptyString(body.thumbnailUrl) ? { thumbnailUrl: body.thumbnailUrl.trim() } : {}),
    });

    return res.status(201).json({ data: property });
  },

  async createTour(req: Request, res: Response) {
    const body = req.body ?? {};

    if (
      !isNonEmptyString(body.title) ||
      !isNonEmptyString(body.description) ||
      !isNonEmptyString(body.city) ||
      !isNonEmptyString(body.country) ||
      !isPositiveNumber(body.pricePerPerson) ||
      !isPositiveNumber(body.durationDays) ||
      !isPositiveNumber(body.minGroupSize) ||
      !isPositiveNumber(body.maxGroupSize) ||
      body.minGroupSize > body.maxGroupSize ||
      !isNonEmptyString(body.hostId) ||
      !Object.values(TourCategory).includes(body.category)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_TOUR_PAYLOAD",
          message: "Invalid tour payload",
        },
      });
    }

    const tour = await adminService.createTour({
      title: body.title.trim(),
      description: body.description.trim(),
      city: body.city.trim(),
      country: body.country.trim(),
      pricePerPerson: body.pricePerPerson,
      durationDays: body.durationDays,
      minGroupSize: body.minGroupSize,
      maxGroupSize: body.maxGroupSize,
      category: body.category,
      hostId: body.hostId,
      ...(isNonEmptyString(body.thumbnailUrl) ? { thumbnailUrl: body.thumbnailUrl.trim() } : {}),
    });

    return res.status(201).json({ data: tour });
  },

  async updateListingStatus(req: Request, res: Response) {
    const { kind, id } = req.params;
    const { status } = req.body ?? {};

    if (
      (kind !== "PROPERTY" && kind !== "TOUR") ||
      typeof id !== "string" ||
      !id ||
      !Object.values(ListingStatus).includes(status)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_LISTING_STATUS_PAYLOAD",
          message: "Invalid listing status payload",
        },
      });
    }

    const listing = await adminService.updateListingStatus(kind, id, status);
    return res.json({ data: listing });
  },

  async deleteListing(req: Request, res: Response) {
    const { kind, id } = req.params;

    if (
      (kind !== "PROPERTY" && kind !== "TOUR") ||
      typeof id !== "string" ||
      !id
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_LISTING_ID",
          message: "Invalid listing id",
        },
      });
    }

    await adminService.deleteListing(kind, id);
    return res.status(204).send();
  },

  async dashboard(_req: Request, res: Response) {
    const data = await adminService.getDashboardMetrics();
    return res.json({ data });
  },

  async bookings(_req: Request, res: Response) {
    const data = await adminService.listAdminPropertyBookings();
    return res.json({ data });
  },

  async updateBookingStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (
      typeof id !== "string" ||
      !id ||
      (status !== "CONFIRMED" && status !== "CANCELLED")
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_BOOKING_STATUS_PAYLOAD",
          message: "Invalid booking status payload",
        },
      });
    }

    const result = await bookingService.updateAdminBookingStatus({
      bookingId: id,
      status,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
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

  async markBookingRefunded(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_BOOKING_ID",
          message: "Invalid booking id",
        },
      });
    }

    const result = await adminService.markBookingRefunded(id);

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
      });
    }

    if (result.kind === "REFUND_NOT_REQUIRED") {
      return res.status(409).json({
        error: {
          code: "REFUND_NOT_REQUIRED",
          message: "Booking does not require a refund",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async payments(_req: Request, res: Response) {
    const data = await adminService.listAdminPayments();
    return res.json({ data });
  },

  async revenue(req: Request, res: Response) {
    const period = typeof req.query.period === "string" ? req.query.period : undefined;
    const data = await adminService.getRevenueManagement(period);
    return res.json({ data });
  },

  async generateSettlement(req: Request, res: Response) {
    const period = typeof req.body?.period === "string" ? req.body.period : "";
    const force = Boolean(req.body?.force);
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({
        error: {
          code: "INVALID_SETTLEMENT_PERIOD",
          message: "period must be YYYY-MM",
        },
      });
    }
    const result = await adminService.generateMonthlySettlement({
      adminId: req.user?.id ?? null,
      period,
      force,
    });
    return res.status(result.kind === "ALREADY_EXISTS" ? 200 : 201).json({ data: result.data, kind: result.kind });
  },

  async markHostPayoutPaid(req: Request, res: Response) {
    const hostId = typeof req.params.hostId === "string" ? req.params.hostId : "";
    const period = typeof req.body?.period === "string" ? req.body.period : "";
    const amount = Number(req.body?.amount ?? 0);
    const bookingCount = Number(req.body?.bookingCount ?? 0);
    const commissionReceivable = Number(req.body?.commissionReceivable ?? 0);

    if (!hostId || !period || !Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_PAYOUT_PAYLOAD",
          message: "Invalid payout payload",
        },
      });
    }

    const result = await adminService.markHostPayoutPaid({
      adminId: req.user?.id ?? null,
      hostId,
      period,
      amount,
      bookingCount: Number.isFinite(bookingCount) ? bookingCount : 0,
      commissionReceivable: Number.isFinite(commissionReceivable) ? commissionReceivable : 0,
    });

    if (result.kind === "HOST_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "HOST_NOT_FOUND",
          message: "Host not found",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async promotions(_req: Request, res: Response) {
    const data = await adminService.listSystemPromotions();
    return res.json({ data });
  },

  async createPromotion(req: Request, res: Response) {
    const code = parseVoucherCode(req.body?.code);
    const discountType = req.body?.discountType === "FIXED_AMOUNT" ? DiscountType.FIXED_AMOUNT : DiscountType.PERCENTAGE;
    const discountValue = Number(req.body?.discountValue);
    const quantity = Math.max(1, Math.floor(Number(req.body?.quantity ?? 10)));
    const expiresAt = typeof req.body?.expiresAt === "string" ? new Date(`${req.body.expiresAt}T23:59:59.999Z`) : null;
    const voucherType = String(req.body?.voucherType ?? "Voucher hệ thống").trim() || "Voucher hệ thống";
    const conditions = parseVoucherConditions(req.body?.conditions);

    if (!code || !Number.isFinite(discountValue) || discountValue <= 0 || !expiresAt || Number.isNaN(expiresAt.getTime())) {
      return res.status(400).json({ error: { code: "INVALID_VOUCHER", message: "Voucher không hợp lệ." } });
    }

    try {
      const promotion = await adminService.createSystemPromotion({
        code,
        discountType,
        discountValue,
        quantity,
        expiresAt,
        voucherType,
        conditions,
      });
      return res.status(201).json({ data: promotion });
    } catch {
      return res.status(409).json({ error: { code: "VOUCHER_CODE_EXISTS", message: "Mã voucher đã tồn tại." } });
    }
  },

  async commissions(_req: Request, res: Response) {
    const data = await adminService.listAdminCommissions();
    return res.json({ data });
  },

  async adminReviews(_req: Request, res: Response) {
    const data = await adminService.listAdminReviews();
    return res.json({ data });
  },

  async auditLogs(_req: Request, res: Response) {
    const data = await adminService.listAdminAuditLogs();
    return res.json({ data });
  },
};
