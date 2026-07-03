import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { bookingService } from "../services/booking.service";
import { prisma } from "../lib/prisma";
import { CancellationPolicy, PropertyType } from "../generated/prisma/enums";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

const MIN_PROPERTY_IMAGES = 8;

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
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_PAYLOAD",
          message: "Invalid property payload",
        },
      });
    }

    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
      : [];
    const normalizedImageUrls: string[] = (
      imageUrls.length
        ? imageUrls.map((url: string) => normalizePropertyImageUrl(url, body.type))
        : [normalizePropertyImageUrl(body.thumbnailUrl, body.type)]
    ).filter((url): url is string => typeof url === "string" && url.length > 0);
    const amenityNames: string[] = Array.isArray(body.amenities)
      ? Array.from(
          new Set(
            body.amenities
              .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
              .map((name: string) => name.trim())
          )
        )
      : [];

    if (normalizedImageUrls.length < MIN_PROPERTY_IMAGES) {
      return res.status(400).json({
        error: {
          code: "NOT_ENOUGH_PROPERTY_IMAGES",
          message: `Please upload at least ${MIN_PROPERTY_IMAGES} real property images`,
        },
      });
    }

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
          ...(typeof body.latitude === "number" ? { latitude: body.latitude } : {}),
          ...(typeof body.longitude === "number" ? { longitude: body.longitude } : {}),
          pricePerNight: body.pricePerNight,
          ...(typeof body.cleaningFee === "number" ? { cleaningFee: body.cleaningFee } : {}),
          maxGuests: body.maxGuests,
          bedroomCount: typeof body.bedroomCount === "number" ? body.bedroomCount : 0,
          bathrooms: body.bathrooms,
          type: body.type,
          hostId: req.user!.id,
          status: "PENDING",
          images: {
            create: normalizedImageUrls.map((url: string, index: number) => ({
              url,
              isPrimary: index === 0,
            })),
          },
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

  async updatePropertyImages(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Property id is required",
        },
      });
    }

    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
      : [];

    if (imageUrls.length < MIN_PROPERTY_IMAGES) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_IMAGES",
          message: `At least ${MIN_PROPERTY_IMAGES} image urls are required`,
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true, type: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const normalizedImageUrls = imageUrls
      .map((url) => normalizePropertyImageUrl(url, property.type))
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    await prisma.$transaction(async (tx) => {
      await tx.propertyImage.deleteMany({ where: { propertyId: property.id } });
      await tx.propertyImage.createMany({
        data: normalizedImageUrls.map((url, index) => ({
          propertyId: property.id,
          url,
          isPrimary: index === 0,
        })),
      });
    });

    return res.json({
      data: {
        propertyId: property.id,
        imageUrls: normalizedImageUrls,
        thumbnailUrl: normalizedImageUrls[0],
      },
    });
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
