import type { Request, Response } from "express";
import { reviewService } from "../services/review.service";

export const reviewController = {
  async list(req: Request, res: Response) {
    const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
    const data = await reviewService.listPublic(propertyId ? { propertyId } : {});
    return res.json({ data });
  },

  async create(req: Request, res: Response) {
    const body = req.body ?? {};
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    const comment = typeof body.comment === "string" ? body.comment : "";
    const ratings = reviewService.normalizeRatings(body);
    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter((url: unknown) => typeof url === "string") : [];

    if (!bookingId || !ratings) {
      return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "Thiếu bookingId hoặc điểm đánh giá không hợp lệ." } });
    }

    const result = await reviewService.createForBooking({
      userId: req.user!.id,
      bookingId,
      ratings,
      comment,
      imageUrls,
    });

    if (result.kind === "BOOKING_NOT_REVIEWABLE") {
      return res.status(409).json({ error: { code: "BOOKING_NOT_REVIEWABLE", message: "Chỉ có thể đánh giá booking đã hoàn tất của bạn." } });
    }
    if (result.kind === "REVIEW_ALREADY_EXISTS") {
      return res.status(409).json({ error: { code: "REVIEW_ALREADY_EXISTS", message: "Booking này đã được đánh giá." } });
    }
    if (result.kind === "COMMENT_TOO_SHORT") {
      return res.status(400).json({ error: { code: "COMMENT_TOO_SHORT", message: "Nội dung đánh giá cần ít nhất 10 ký tự." } });
    }

    return res.status(201).json({ data: result.data });
  },

  async listHost(req: Request, res: Response) {
    const data = await reviewService.listForHost(req.user!.id);
    return res.json({ data });
  },

  async hostReply(req: Request, res: Response) {
    const reviewId = typeof req.params.id === "string" ? req.params.id : "";
    const reply = typeof req.body?.reply === "string" ? req.body.reply : "";
    const result = await reviewService.replyAsHost(req.user!.id, reviewId, reply);

    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "REVIEW_NOT_FOUND", message: "Không tìm thấy đánh giá thuộc chỗ nghỉ của bạn." } });
    }
    if (result.kind === "INVALID_REPLY") {
      return res.status(400).json({ error: { code: "INVALID_REPLY", message: "Phản hồi không được để trống." } });
    }
    return res.json({ data: result.data });
  },
};
