import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { bookingService } from "../services/booking.service";
import { hostPropertyService } from "../services/host-property.service";
import { prisma } from "../lib/prisma";
import { AvailabilityStatus, BookingMethod, CancellationPolicy, PetPolicy, PropertyType } from "../generated/prisma/enums";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

export const hostController = {
  async uploadPropertyImage(req: Request, res: Response) {
    const imageData = req.body?.imageData;

    if (typeof imageData !== "string") {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_PAYLOAD", message: "imageData is required" } });
    }

    const match = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_FORMAT", message: "Only jpeg, png, and webp images are supported" } });
    }

    const mimeExtension = match[1];
    const base64Payload = match[2];
    if (!mimeExtension || !base64Payload) {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_FORMAT", message: "Invalid image payload" } });
    }

    const extension = mimeExtension === "jpeg" ? "jpg" : mimeExtension;
    const buffer = Buffer.from(base64Payload, "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: { code: "IMAGE_TOO_LARGE", message: "Image must be 4MB or smaller after compression" } });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "properties");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/properties/${filename}`;
    return res.status(201).json({ data: { url: publicUrl } });
  },

  async createProperty(req: Request, res: Response) {
    const body = req.body ?? {};

    if (
      typeof body.title !== "string" ||
      typeof body.addressLine1 !== "string" ||
      typeof body.city !== "string" ||
      typeof body.pricePerNight !== "number" ||
      typeof body.maxGuests !== "number" ||
      typeof body.bathrooms !== "number" ||
      !Object.values(PropertyType).includes(body.type)
    ) {
      return res.status(400).json({ error: { code: "INVALID_PROPERTY_PAYLOAD", message: "Invalid property payload" } });
    }

    const thumbnailUrl = normalizePropertyImageUrl(body.thumbnailUrl, body.type);

    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          title: body.title.trim(),
          description: typeof body.description === "string" ? body.description.trim() : null,
          addressLine1: body.addressLine1.trim(),
          addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2.trim() : null,
          city: body.city.trim(),
          postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() : null,
          country: typeof body.country === "string" ? body.country.trim() : "Việt Nam",
          pricePerNight: body.pricePerNight,
          ...(typeof body.cleaningFee === "number" ? { cleaningFee: body.cleaningFee } : {}),
          maxGuests: body.maxGuests,
          bedroomCount: typeof body.bedroomCount === "number" ? body.bedroomCount : 0,
          bathrooms: body.bathrooms,
          type: body.type,
          hostId: req.user!.id,
          status: "PENDING",
          ...(thumbnailUrl ? { images: { create: { url: thumbnailUrl, isPrimary: true } } } : {}),
        },
      });

      await tx.user.update({ where: { id: req.user!.id }, data: { role: "HOST" } });

      const province = await tx.province.findUnique({
        where: { name: body.city.trim() },
        select: { id: true, name: true },
      });
      const assignments = province
        ? await tx.operatorProvinceAssignment.findMany({
            where: { provinceId: province.id, operator: { isActive: true } },
            select: { operatorId: true },
          })
        : [];

      if (assignments.length > 0) {
        await tx.notification.createMany({
          data: assignments.map((assignment) => ({
            userId: assignment.operatorId,
            type: "SYSTEM",
            title: "Yêu cầu duyệt cơ sở lưu trú mới",
            message: `${created.title} tại ${created.city} vừa được gửi để xét duyệt trước khi mở nhận đặt phòng.`,
            metadata: { propertyId: created.id, action: "PROPERTY_APPROVAL_REQUESTED" },
          })),
        });
      }

      return created;
    });

    return res.status(201).json({ data: property });
  },

  async listProperties(req: Request, res: Response) {
    const properties = await prisma.property.findMany({
      where: { hostId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        bookings: { select: { id: true, status: true, checkIn: true, checkOut: true } },
        _count: { select: { bookings: true } },
      },
    });

    return res.json({
      data: properties.map((property) => {
        const upcomingWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const now = new Date();
        const arrivals = property.bookings.filter(
          (b) => b.checkIn && b.checkIn >= now && b.checkIn <= upcomingWindowEnd
        ).length;
        const departures = property.bookings.filter(
          (b) => b.checkOut && b.checkOut >= now && b.checkOut <= upcomingWindowEnd
        ).length;

        return {
          id: property.id,
          code: `PR-${property.id.slice(-6).toUpperCase()}`,
          title: property.title,
          address: [property.addressLine1, property.city, property.country].filter(Boolean).join(", "),
          city: property.city,
          country: property.country,
          status: property.status,
          type: property.type,
          pricePerNight: property.pricePerNight.toNumber(),
          maxGuests: property.maxGuests,
          bedroomCount: property.bedroomCount,
          bathrooms: property.bathrooms,
          thumbnailUrl: normalizePropertyImageUrl(property.images[0]?.url, property.type),
          bookings: property._count.bookings,
          arrivals,
          departures,
          reviews: 0,
          cancellations: property.bookings.filter((b) => b.status === "CANCELLED").length,
          revenue: 0,
          occupancy: 0,
          createdAt: property.createdAt.toISOString(),
        };
      }),
    });
  },

  // ── Property manage endpoints ──────────────────────────────────────────────

  async getProperty(req: Request, res: Response) {
    const id = req.params.id as string;
    const property = await hostPropertyService.getHostPropertyById(req.user!.id, id);
    if (!property) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: property });
  },

  async updatePropertyInfo(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const updated = await hostPropertyService.updateHostPropertyInfo(req.user!.id, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: body.description !== undefined ? body.description : undefined,
      type: Object.values(PropertyType).includes(body.type) ? body.type : undefined,
      addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1 : undefined,
      addressLine2: body.addressLine2 !== undefined ? body.addressLine2 : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      country: typeof body.country === "string" ? body.country : undefined,
      maxGuests: typeof body.maxGuests === "number" ? body.maxGuests : undefined,
      bathrooms: typeof body.bathrooms === "number" ? body.bathrooms : undefined,
      amenities: Array.isArray(body.amenities) ? body.amenities.filter((a: unknown) => typeof a === "string") : undefined,
      languages: Array.isArray(body.languages) ? body.languages.filter((l: unknown) => typeof l === "string") : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: updated });
  },

  async updatePropertyPricing(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const updated = await hostPropertyService.updateHostPropertyPricing(req.user!.id, id, {
      pricePerNight: typeof body.pricePerNight === "number" ? body.pricePerNight : undefined,
      cleaningFee: body.cleaningFee !== undefined ? body.cleaningFee : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: updated });
  },

  async updatePropertyPolicies(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const updated = await hostPropertyService.updateHostPropertyPolicies(req.user!.id, id, {
      bookingMethod: Object.values(BookingMethod).includes(body.bookingMethod) ? body.bookingMethod : undefined,
      cancellationPolicy: Object.values(CancellationPolicy).includes(body.cancellationPolicy) ? body.cancellationPolicy : undefined,
      cancellationFreeDays: typeof body.cancellationFreeDays === "number" ? body.cancellationFreeDays : undefined,
      smokingAllowed: typeof body.smokingAllowed === "boolean" ? body.smokingAllowed : undefined,
      partiesAllowed: typeof body.partiesAllowed === "boolean" ? body.partiesAllowed : undefined,
      petsPolicy: Object.values(PetPolicy).includes(body.petsPolicy) ? body.petsPolicy : undefined,
      checkInFrom: body.checkInFrom !== undefined ? body.checkInFrom : undefined,
      checkInTo: body.checkInTo !== undefined ? body.checkInTo : undefined,
      checkOutFrom: body.checkOutFrom !== undefined ? body.checkOutFrom : undefined,
      checkOutTo: body.checkOutTo !== undefined ? body.checkOutTo : undefined,
      availabilityWindow: typeof body.availabilityWindow === "number" ? body.availabilityWindow : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: updated });
  },

  async togglePropertyStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await hostPropertyService.toggleHostPropertyStatus(req.user!.id, id);

    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    if (result.kind === "CANNOT_TOGGLE") {
      return res.status(409).json({
        error: {
          code: "CANNOT_TOGGLE_STATUS",
          message: `Property status '${result.currentStatus}' cannot be toggled by host`,
        },
      });
    }
    return res.json({ data: result.data });
  },

  // ── Availability calendar ──────────────────────────────────────────────────

  async getCalendar(req: Request, res: Response) {
    const id = req.params.id as string;
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: { code: "INVALID_PARAMS", message: "year and month (1–12) are required" } });
    }

    const calendar = await hostPropertyService.getPropertyCalendar(req.user!.id, id, year, month);
    if (!calendar) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: calendar });
  },

  async blockDates(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const dates: string[] = Array.isArray(body.dates) ? body.dates.filter((d: unknown) => typeof d === "string") : [];
    const statusRaw = body.status === "MAINTENANCE" ? AvailabilityStatus.MAINTENANCE : AvailabilityStatus.BLOCKED;
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

    if (dates.length === 0) {
      return res.status(400).json({ error: { code: "INVALID_DATES", message: "dates array is required" } });
    }

    const result = await hostPropertyService.blockPropertyDates(req.user!.id, id, dates, statusRaw, reason);
    if (!result) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: result });
  },

  async unblockDates(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const dates: string[] = Array.isArray(body.dates) ? body.dates.filter((d: unknown) => typeof d === "string") : [];

    if (dates.length === 0) {
      return res.status(400).json({ error: { code: "INVALID_DATES", message: "dates array is required" } });
    }

    const result = await hostPropertyService.unblockPropertyDates(req.user!.id, id, dates);
    if (!result) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.json({ data: result });
  },

  // ── Property image management ──────────────────────────────────────────────

  async addPropertyImage(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body ?? {};
    const imageData = body.imageData;

    if (typeof imageData !== "string") {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_PAYLOAD", message: "imageData is required" } });
    }

    const match = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_FORMAT", message: "Only jpeg, png, and webp images are supported" } });
    }

    const mimeExtension = match[1];
    const base64Payload = match[2];
    if (!mimeExtension || !base64Payload) {
      return res.status(400).json({ error: { code: "INVALID_IMAGE_FORMAT", message: "Invalid image payload" } });
    }

    const extension = mimeExtension === "jpeg" ? "jpg" : mimeExtension;
    const buffer = Buffer.from(base64Payload, "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: { code: "IMAGE_TOO_LARGE", message: "Image must be 4MB or smaller" } });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "properties");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/properties/${filename}`;
    const isPrimary = body.isPrimary === true;

    const image = await hostPropertyService.addPropertyImage(req.user!.id, id, publicUrl, isPrimary);
    if (!image) {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    return res.status(201).json({ data: image });
  },

  async deletePropertyImage(req: Request, res: Response) {
    const id = req.params.id as string;
    const imageId = req.params.imageId as string;
    const result = await hostPropertyService.deletePropertyImage(req.user!.id, id, imageId);
    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "IMAGE_NOT_FOUND", message: "Image not found" } });
    }
    return res.json({ data: { success: true } });
  },

  async setPrimaryImage(req: Request, res: Response) {
    const id = req.params.id as string;
    const imageId = req.params.imageId as string;
    const result = await hostPropertyService.setPrimaryImage(req.user!.id, id, imageId);
    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "IMAGE_NOT_FOUND", message: "Image not found" } });
    }
    return res.json({ data: { success: true } });
  },

  // ── Booking management ─────────────────────────────────────────────────────

  async listBookings(req: Request, res: Response) {
    const bookings = await bookingService.listHostBookings(req.user!.id);
    return res.json({ data: bookings });
  },

  async confirmBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CONFIRMED");
  },

  async cancelBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CANCELLED");
  },
};

async function handleUpdateStatus(req: Request, res: Response, status: "CONFIRMED" | "CANCELLED") {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({ error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" } });
  }

  const result = await bookingService.updateHostPropertyBookingStatus({
    hostId: req.user!.id,
    bookingId: id,
    status,
  });

  if (result.kind === "BOOKING_NOT_FOUND") {
    return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" } });
  }

  if (result.kind === "BOOKING_NOT_PENDING") {
    return res.status(409).json({ error: { code: "BOOKING_NOT_PENDING", message: "Only pending bookings can be updated" } });
  }

  return res.json({ data: result.data });
}
