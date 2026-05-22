import type { Request, Response } from "express";
import { bookingService } from "../services/booking.service";
import { prisma } from "../lib/prisma";
import { CancellationPolicy, PropertyType } from "../generated/prisma/enums";

export const hostController = {
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
          ...(typeof body.thumbnailUrl === "string" && body.thumbnailUrl.trim()
            ? {
                images: {
                  create: {
                    url: body.thumbnailUrl.trim(),
                    isPrimary: true,
                  },
                },
              }
            : {}),
        },
      });

      await tx.user.update({
        where: { id: req.user!.id },
        data: { role: "HOST" },
      });

      return created;
    });

    return res.status(201).json({ data: property });
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
