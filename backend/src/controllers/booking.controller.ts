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
      paymentOption: req.body.paymentOption,
      voucherCode: req.body.voucherCode,
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

    if (result.kind === "INVALID_VOUCHER") {
      return res.status(400).json({
        error: {
          code: "INVALID_VOUCHER",
          message: result.message,
        },
      });
    }

    if (result.kind === "BANK_ACCOUNT_REQUIRED") {
      return res.status(400).json({
        error: {
          code: "BANK_ACCOUNT_REQUIRED",
          message: "Cập nhật tài khoản ngân hàng trong mục Tài khoản của quý khách để lựa chọn phương thức thanh toán này",
        },
      });
    }

    if (result.kind === "DIRECT_PAYMENT_VOUCHER_NOT_ALLOWED") {
      return res.status(400).json({
        error: {
          code: "DIRECT_PAYMENT_VOUCHER_NOT_ALLOWED",
          message: "Thanh toán trực tiếp không được thêm mã giảm giá",
        },
      });
    }

    return res.status(201).json({ data: result.data });
  },

  async cancelMine(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_BOOKING_ID",
          message: "Booking id is required",
        },
      });
    }

    const result = await bookingService.cancelTravelerBooking({
      userId: req.user!.id,
      bookingId: id,
      reason: req.body.reason,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
      });
    }

    if (result.kind === "BOOKING_ALREADY_CANCELLED") {
      return res.status(409).json({
        error: {
          code: "BOOKING_ALREADY_CANCELLED",
          message: "Booking already cancelled",
        },
      });
    }

    if (result.kind === "BOOKING_NOT_CANCELLABLE") {
      return res.status(409).json({
        error: {
          code: "BOOKING_NOT_CANCELLABLE",
          message: "Completed bookings cannot be cancelled",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async reportMine(req: Request, res: Response) {
    const { id } = req.params;
    const reason = String(req.body?.reason ?? "").trim();

    if (typeof id !== "string" || !id || reason.length < 3) {
      return res.status(400).json({
        error: {
          code: "INVALID_REPORT_PAYLOAD",
          message: "Report reason is required",
        },
      });
    }

    const result = await bookingService.reportTravelerBooking({
      userId: req.user!.id,
      bookingId: id,
      reason,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
      });
    }

    return res.status(201).json({ data: result.data });
  },
};
