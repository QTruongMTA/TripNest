import type { Request, Response } from "express";
import { bookingService } from "../services/booking.service";

export const bookingController = {
  async listMine(req: Request, res: Response) {
    const bookings = await bookingService.listTravelerBookings(req.user!.id);
    return res.json({ data: bookings });
  },

  async createProperty(req: Request, res: Response) {
    const result = await bookingService.createPropertyBooking({
      userId: req.user!.id,
      propertyId: req.body.propertyId,
      checkIn: new Date(req.body.checkIn),
      checkOut: new Date(req.body.checkOut),
      guests: req.body.guests,
      notes: req.body.notes,
    });

    if (result.kind === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    if (result.kind === "GUEST_LIMIT_EXCEEDED") {
      return res.status(400).json({
        error: {
          code: "GUEST_LIMIT_EXCEEDED",
          message: "Guest count exceeds property capacity",
        },
      });
    }

    if (result.kind === "PROPERTY_UNAVAILABLE") {
      return res.status(409).json({
        error: {
          code: "PROPERTY_UNAVAILABLE",
          message: "Property is not available for the selected dates",
        },
      });
    }

    return res.status(201).json({ data: result.data });
  },
};
