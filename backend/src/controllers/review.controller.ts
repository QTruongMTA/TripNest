import type { Request, Response } from "express";
import { reviewService } from "../services/review.service";
import { operatorService } from "../services/operator.service";

function parseReviewBody(body: Record<string, unknown>) {
  const criteria = typeof body.criteria === "object" && body.criteria !== null ? body.criteria as Record<string, unknown> : {};
  return {
    bookingId: String(body.bookingId ?? ""),
    rating: Number(body.rating),
    comment: String(body.comment ?? ""),
    criteria: {
      cleanliness: Number(criteria.cleanliness),
      comfort: Number(criteria.comfort),
      location: Number(criteria.location),
      amenities: Number(criteria.amenities),
      value: Number(criteria.value),
    },
    images: Array.isArray(body.images) ? body.images as Array<{ name?: string; dataUrl: string }> : [],
  };
}

export const reviewController = {
  async property(req: Request, res: Response) {
    const propertyId = String(req.params.propertyId ?? "");
    if (!propertyId) return res.status(400).json({ error: { code: "INVALID_PROPERTY_ID", message: "Property id is required" } });
    const data = await reviewService.listPublicPropertyReviews(propertyId);
    return res.json({ data });
  },

  async submit(req: Request, res: Response) {
    const input = parseReviewBody(req.body ?? {});
    if (!input.bookingId || !input.comment.trim()) {
      return res.status(400).json({ error: { code: "INVALID_REVIEW", message: "Vui lòng nhập đầy đủ nội dung đánh giá." } });
    }
    const result = await reviewService.submit(req.user!.id, input);
    if (result.kind === "BOOKING_NOT_FOUND") return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Không tìm thấy booking." } });
    if (result.kind === "STAY_NOT_COMPLETED") return res.status(409).json({ error: { code: "STAY_NOT_COMPLETED", message: "Chỉ khách đã hoàn tất lưu trú mới được đánh giá." } });
    return res.status(201).json({ data: result.data });
  },

  async host(req: Request, res: Response) {
    const data = await reviewService.listHostReviews(req.user!.id);
    return res.json({ data });
  },

  async hostRespond(req: Request, res: Response) {
    const result = await reviewService.openHostResponseConversation(req.user!.id, String(req.params.id ?? ""));
    if (result.kind === "REVIEW_NOT_FOUND") return res.status(404).json({ error: { code: "REVIEW_NOT_FOUND", message: "Không tìm thấy đánh giá." } });
    return res.json({ data: result.data });
  },

  async operator(req: Request, res: Response) {
    const provinces = req.user!.role === "OPERATOR_SUB"
      ? await operatorService.getSubOperatorProvinces(req.user!.id)
      : await operatorService.getOperatorProvinces(req.user!.id);
    const data = await reviewService.listOperatorReviews(provinces.map((province) => province.name), String(req.query.sort ?? "recent"));
    return res.json({ data });
  },

  async admin(req: Request, res: Response) {
    const data = await reviewService.listAdminReviews(String(req.query.sort ?? "recent"));
    return res.json({ data });
  },

  async report(req: Request, res: Response) {
    const note = String(req.body?.note ?? "").trim();
    if (note.length < 5) return res.status(400).json({ error: { code: "INVALID_NOTE", message: "Vui lòng nhập nội dung báo cáo." } });
    const result = await reviewService.reportToOperator(req.user!.id, String(req.params.id ?? ""), note);
    if (result.kind === "REVIEW_NOT_FOUND") return res.status(404).json({ error: { code: "REVIEW_NOT_FOUND", message: "Không tìm thấy đánh giá." } });
    return res.json({ data: result.data });
  },
};
