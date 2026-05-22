import type { Request, Response } from "express";
import {
  CancellationPolicy,
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
    const data = await adminService.listAdminBookings();
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

  async payments(_req: Request, res: Response) {
    const data = await adminService.listAdminPayments();
    return res.json({ data });
  },

  async promotions(_req: Request, res: Response) {
    const data = await adminService.listAdminPromotions();
    return res.json({ data });
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
