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
      ratePlanId: typeof req.body.ratePlanId === "string" ? req.body.ratePlanId : null,
      promotionCode: typeof req.body.promotionCode === "string" ? req.body.promotionCode : null,
      notes: req.body.notes,
    });

    if (result.kind === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" },
      });
    }

    if (result.kind === "GUEST_LIMIT_EXCEEDED") {
      return res.status(400).json({
        error: { code: "GUEST_LIMIT_EXCEEDED", message: "Guest count exceeds property capacity" },
      });
    }

    if (result.kind === "PROPERTY_UNAVAILABLE") {
      return res.status(409).json({
        error: { code: "PROPERTY_UNAVAILABLE", message: "Property is not available for the selected dates" },
      });
    }

    if (result.kind === "CLOSED_TO_ARRIVAL") {
      return res.status(409).json({
        error: { code: "CLOSED_TO_ARRIVAL", message: "Không nhận khách check-in vào ngày bạn chọn." },
      });
    }

    if (result.kind === "CLOSED_TO_DEPARTURE") {
      return res.status(409).json({
        error: { code: "CLOSED_TO_DEPARTURE", message: "Không cho phép trả phòng vào ngày bạn chọn." },
      });
    }

    if (result.kind === "MIN_STAY_NOT_MET") {
      return res.status(409).json({
        error: { code: "MIN_STAY_NOT_MET", message: "Số đêm lưu trú chưa đạt yêu cầu tối thiểu." },
      });
    }

    if (result.kind === "MAX_STAY_EXCEEDED") {
      return res.status(409).json({
        error: { code: "MAX_STAY_EXCEEDED", message: "Số đêm lưu trú vượt giới hạn tối đa cho phép." },
      });
    }

    if (result.kind === "RATE_PLAN_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "RATE_PLAN_NOT_FOUND", message: "Gói giá không tồn tại hoặc không còn áp dụng." },
      });
    }

    if (result.kind === "PROMOTION_NOT_AVAILABLE") {
      return res.status(409).json({
        error: { code: "PROMOTION_NOT_AVAILABLE", message: "Mã ưu đãi không hợp lệ, đã hết hạn hoặc không áp dụng cho chỗ nghỉ này." },
      });
    }

    if (result.kind === "PROMOTION_MIN_ORDER_NOT_MET") {
      return res.status(409).json({
        error: { code: "PROMOTION_MIN_ORDER_NOT_MET", message: "Đơn đặt chưa đạt giá trị tối thiểu để dùng mã ưu đãi." },
      });
    }

    return res.status(201).json({ data: result.data });
  },

  async getDetail(req: Request, res: Response) {
    const { id } = req.params;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" } });
    }
    const booking = await bookingService.getTravelerBookingDetail({ userId: req.user!.id, bookingId: id });
    if (!booking) return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" } });
    return res.json({ data: booking });
  },

  async cancelGuest(req: Request, res: Response) {
    const { id } = req.params;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" } });
    }

    const result = await bookingService.cancelByGuest({
      userId: req.user!.id,
      bookingId: id,
      reason: typeof req.body?.reason === "string" ? req.body.reason : null,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" } });
    }
    if (result.kind === "BOOKING_NOT_CANCELLABLE") {
      return res.status(409).json({ error: { code: "BOOKING_NOT_CANCELLABLE", message: "Booking cannot be cancelled in its current state" } });
    }

    return res.json({ data: result.data });
  },
};
