import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { bookingService } from "../services/booking.service";
import { prisma } from "../lib/prisma";
import {
  BookingMethod,
  CancellationPolicy,
  LegalEntityType,
  ParkingType,
  PetPolicy,
  PropertyType,
  RatePlanType,
} from "../generated/prisma/enums";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";
import { PROPERTY_UPLOAD_DIR } from "../utils/upload-path.utils";

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = finiteNumber(value);
  return parsed === undefined ? fallback : Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function blockedDatesBefore(value: unknown): Date[] {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return [];
  const firstBookableDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(firstBookableDate.getTime())) return [];

  const today = new Date();
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dates: Date[] = [];
  while (cursor < firstBookableDate && dates.length < 730) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export const hostController = {
  async uploadPropertyImage(req: Request, res: Response) {
    const imageData = req.body?.imageData;

    if (typeof imageData !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_PAYLOAD",
          message: "imageData is required",
        },
      });
    }

    const match = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_FORMAT",
          message: "Only jpeg, png, and webp images are supported",
        },
      });
    }

    const mimeExtension = match[1];
    const base64Payload = match[2];
    if (!mimeExtension || !base64Payload) {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_FORMAT",
          message: "Invalid image payload",
        },
      });
    }

    const extension = mimeExtension === "jpeg" ? "jpg" : mimeExtension;
    const buffer = Buffer.from(base64Payload, "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "Image must be 4MB or smaller after compression",
        },
      });
    }

    await mkdir(PROPERTY_UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(`${PROPERTY_UPLOAD_DIR}/${filename}`, buffer);

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
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_PAYLOAD",
          message: "Invalid property payload",
        },
      });
    }

    const submittedImages: Array<{ url: string; isPrimary: boolean }> = [];
    if (Array.isArray(body.images)) {
      for (const image of body.images) {
        if (!image || typeof image !== "object") continue;
        const url = normalizePropertyImageUrl(
          typeof image.url === "string" ? image.url : null,
          body.type
        );
        if (url) submittedImages.push({ url, isPrimary: image.isPrimary === true });
      }
    }

    const legacyThumbnailUrl = normalizePropertyImageUrl(body.thumbnailUrl, body.type);
    const requestedImages = submittedImages.length
      ? submittedImages
      : legacyThumbnailUrl
        ? [{ url: legacyThumbnailUrl, isPrimary: true }]
        : [];
    const requestedPrimaryIndex = requestedImages.findIndex((image) => image.isPrimary);
    const primaryIndex = requestedPrimaryIndex >= 0 ? requestedPrimaryIndex : 0;
    const propertyImages = requestedImages.map((image, index) => ({
      url: image.url,
      isPrimary: index === primaryIndex,
    }));
    const amenityNames = cleanStringList(body.amenities);
    const languageNames = cleanStringList(body.languages);
    const bedrooms = Array.isArray(body.bedrooms)
      ? body.bedrooms.slice(0, 50).map((bedroom: unknown, index: number) => {
          const item = bedroom && typeof bedroom === "object" ? bedroom as Record<string, unknown> : {};
          return {
            roomNumber: index + 1,
            singleBeds: boundedInt(item.singleBeds, 0, 0, 20),
            doubleBeds: boundedInt(item.doubleBeds, 0, 0, 20),
            kingBeds: boundedInt(item.kingBeds, 0, 0, 20),
            superKingBeds: boundedInt(item.superKingBeds, 0, 0, 20),
            bunkBeds: boundedInt(item.bunkBeds, 0, 0, 20),
            sofaBeds: boundedInt(item.sofaBeds, 0, 0, 20),
            futonBeds: boundedInt(item.futonBeds, 0, 0, 20),
          };
        })
      : [];
    const ratePlans = Array.isArray(body.ratePlans)
      ? body.ratePlans.flatMap((ratePlan: unknown) => {
          if (!ratePlan || typeof ratePlan !== "object") return [];
          const item = ratePlan as Record<string, unknown>;
          if (!Object.values(RatePlanType).includes(item.type as RatePlanType)) return [];
          return [{
            type: item.type as RatePlanType,
            enabled: item.enabled !== false,
            discountPct: boundedInt(item.discountPct, 0, 0, 99),
          }];
        })
      : [];
    const childPricing = body.childPricing && typeof body.childPricing === "object"
      ? {
          enabled: body.childPricing.enabled !== false,
          infantFree: body.childPricing.infantFree !== false,
          infantPrice: body.childPricing.infantFree === false ? finiteNumber(body.childPricing.infantPrice) ?? 0 : null,
          childMaxAge: boundedInt(body.childPricing.childMaxAge, 17, 3, 17),
          childFree: body.childPricing.childFree !== false,
          childPrice: body.childPricing.childFree === false ? finiteNumber(body.childPricing.childPrice) ?? 0 : null,
        }
      : null;
    const owners = Array.isArray(body.owners)
      ? body.owners.slice(0, 4).flatMap((owner: unknown, index: number) => {
          if (!owner || typeof owner !== "object") return [];
          const item = owner as Record<string, unknown>;
          const firstName = typeof item.firstName === "string" ? item.firstName.trim() : "";
          const lastName = typeof item.lastName === "string" ? item.lastName.trim() : "";
          const birthDateText = typeof item.birthDate === "string" ? item.birthDate : "";
          const birthDate = new Date(`${birthDateText}T00:00:00.000Z`);
          if (!firstName || !lastName || Number.isNaN(birthDate.getTime())) return [];
          return [{ firstName, lastName, birthDate, sortOrder: index }];
        })
      : [];
    const initiallyBlockedDates = blockedDatesBefore(body.firstBookableDate);
    const latitude = finiteNumber(body.latitude);
    const longitude = finiteNumber(body.longitude);
    const sizeM2 = finiteNumber(body.sizeM2);

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
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          maxGuests: boundedInt(body.maxGuests, 2, 1, 100),
          bedroomCount: bedrooms.length || boundedInt(body.bedroomCount, 0, 0, 50),
          bathrooms: boundedInt(body.bathrooms, 1, 1, 50),
          livingRoomSofaBeds: boundedInt(body.livingRoomSofaBeds, 0, 0, 20),
          childrenAllowed: body.childrenAllowed !== false,
          cribsAvailable: body.cribsAvailable === true,
          ...(sizeM2 !== undefined ? { sizeM2 } : {}),
          type: body.type,
          bookingMethod: Object.values(BookingMethod).includes(body.bookingMethod) ? body.bookingMethod : BookingMethod.INSTANT,
          launchDiscountEnabled: body.launchDiscountEnabled === true,
          cancellationFreeDays: boundedInt(body.cancellationFreeDays, 1, 0, 365),
          mistakeProtection: body.mistakeProtection !== false,
          breakfastIncluded: body.breakfastIncluded === true,
          parkingType: Object.values(ParkingType).includes(body.parkingType) ? body.parkingType : ParkingType.NOT_AVAILABLE,
          smokingAllowed: body.smokingAllowed === true,
          partiesAllowed: body.partiesAllowed === true,
          petsPolicy: Object.values(PetPolicy).includes(body.petsPolicy) ? body.petsPolicy : PetPolicy.NOT_ALLOWED,
          checkInFrom: typeof body.checkInFrom === "string" ? body.checkInFrom : null,
          checkInTo: typeof body.checkInTo === "string" ? body.checkInTo : null,
          checkOutFrom: typeof body.checkOutFrom === "string" ? body.checkOutFrom : null,
          checkOutTo: typeof body.checkOutTo === "string" ? body.checkOutTo : null,
          groupPricingEnabled: body.groupPricingEnabled === true,
          oneGuestDiscountPct: boundedInt(body.oneGuestDiscountPct, 0, 0, 99),
          availabilityWindow: boundedInt(body.availabilityWindow, 365, 1, 730),
          longStayAllowed: body.longStayAllowed === true,
          maxStayNights: body.longStayAllowed === true ? boundedInt(body.maxStayNights, 30, 30, 365) : null,
          legalEntityType: Object.values(LegalEntityType).includes(body.legalEntityType) ? body.legalEntityType : LegalEntityType.INDIVIDUAL,
          ownerAlias: typeof body.ownerAlias === "string" && body.ownerAlias.trim() ? body.ownerAlias.trim() : null,
          hostId: req.user!.id,
          status: "PENDING",
          ...(propertyImages.length
            ? {
                images: {
                  create: propertyImages,
                },
              }
            : {}),
          ...(bedrooms.length ? { bedrooms: { create: bedrooms } } : {}),
          ...(amenityNames.length
            ? {
                amenities: {
                  connectOrCreate: amenityNames.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                },
              }
            : {}),
          ...(languageNames.length
            ? { languages: { create: languageNames.map((language) => ({ language })) } }
            : {}),
          ...(ratePlans.length ? { ratePlans: { create: ratePlans } } : {}),
          ...(childPricing ? { childPricing: { create: childPricing } } : {}),
          ...(owners.length ? { owners: { create: owners } } : {}),
          ...(initiallyBlockedDates.length
            ? {
                availability: {
                  create: initiallyBlockedDates.map((date) => ({
                    date,
                    status: "BLOCKED" as const,
                    reason: "Chưa đến ngày bắt đầu nhận khách",
                  })),
                },
              }
            : {}),
        },
      });

      await tx.user.update({
        where: { id: req.user!.id },
        data: { role: "HOST" },
      });

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
            metadata: {
              propertyId: created.id,
              action: "PROPERTY_APPROVAL_REQUESTED",
            },
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
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        bookings: {
          select: { id: true, status: true, checkIn: true, checkOut: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return res.json({
      data: properties.map((property) => {
        const upcomingWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const now = new Date();
        const arrivals = property.bookings.filter((booking) =>
          booking.checkIn && booking.checkIn >= now && booking.checkIn <= upcomingWindowEnd
        ).length;
        const departures = property.bookings.filter((booking) =>
          booking.checkOut && booking.checkOut >= now && booking.checkOut <= upcomingWindowEnd
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
          cancellations: property.bookings.filter((booking) => booking.status === "CANCELLED").length,
          revenue: 0,
          occupancy: 0,
          createdAt: property.createdAt.toISOString(),
        };
      }),
    });
  },

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

async function handleUpdateStatus(
  req: Request,
  res: Response,
  status: "CONFIRMED" | "CANCELLED"
) {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      error: {
        code: "INVALID_BOOKING_ID",
        message: "Booking id is required",
      },
    });
  }

  const result = await bookingService.updateHostPropertyBookingStatus({
    hostId: req.user!.id,
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
}
