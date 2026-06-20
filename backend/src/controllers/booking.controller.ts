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

  async recordPayment(req: Request, res: Response) {
    const bookingId = typeof req.params.id === "string" && req.params.id ? req.params.id : null;
    if (!bookingId) {
      return res.status(400).json({
        error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" },
      });
    }

    const result = await bookingService.recordTravelerPayment({
      userId: req.user!.id,
      bookingId,
      method: req.body.method,
      transactionId: req.body.transactionId,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
      });
    }

    if (result.kind === "BOOKING_NOT_PAYABLE") {
      return res.status(409).json({
        error: { code: "BOOKING_NOT_PAYABLE", message: "Booking cannot be paid" },
      });
    }

    if (result.kind === "HOST_CONFIRMATION_REQUIRED") {
      return res.status(403).json({
        error: {
          code: "HOST_CONFIRMATION_REQUIRED",
          message: "Tiền mặt và chuyển khoản tại cơ sở phải do host xác nhận.",
        },
      });
    }

    return res.json({ data: result.data });
  },
};
