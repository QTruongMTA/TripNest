import type { Request, Response } from "express";
import { reviewService } from "../services/review.service";

export const reviewController = {
  async create(req: Request, res: Response) {
    const result = await reviewService.create({
      userId: req.user!.id,
      bookingId: req.body.bookingId,
      cleanlinessRating: req.body.cleanlinessRating,
      locationRating: req.body.locationRating,
      serviceRating: req.body.serviceRating,
      valueRating: req.body.valueRating,
      comment: req.body.comment,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
      });
    }
    if (result.kind === "BOOKING_NOT_REVIEWABLE") {
      return res.status(409).json({
        error: {
          code: "BOOKING_NOT_REVIEWABLE",
          message: "Chỉ có thể đánh giá sau khi booking đã trả phòng và thanh toán đầy đủ.",
        },
      });
    }
    if (result.kind === "REVIEW_ALREADY_EXISTS") {
      return res.status(409).json({
        error: {
          code: "REVIEW_ALREADY_EXISTS",
          message: "Booking này đã được đánh giá.",
        },
      });
    }

    return res.status(201).json({ data: result.data });
  },

  async listProperty(req: Request, res: Response) {
    const propertyId = typeof req.params.propertyId === "string" ? req.params.propertyId : "";
    const data = await reviewService.listPropertyReviews(propertyId);
    return res.json({ data });
  },
};
