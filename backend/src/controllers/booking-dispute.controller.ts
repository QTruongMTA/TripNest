import type { Request, Response } from "express";
import { bookingDisputeService } from "../services/booking-dispute.service";

function readPayload(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  return {
    subject: typeof value.subject === "string" ? value.subject : "",
    description: typeof value.description === "string" ? value.description : "",
  };
}

function respondResult(res: Response, result: Awaited<ReturnType<typeof bookingDisputeService.createForBooking>>) {
  if (result.kind === "BOOKING_NOT_FOUND") {
    return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Không tìm thấy booking phù hợp." } });
  }
  if (result.kind === "INVALID_PAYLOAD") {
    return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "Tiêu đề cần ít nhất 5 ký tự và mô tả cần ít nhất 10 ký tự." } });
  }
  if (result.kind === "ACTIVE_CASE_EXISTS") {
    return res.status(409).json({ error: { code: "ACTIVE_CASE_EXISTS", message: "Booking này đang có support case mở. Vui lòng xử lý case hiện tại trước." } });
  }
  return res.status(201).json({ data: result.data });
}

export const bookingDisputeController = {
  async guestList(req: Request, res: Response) {
    const result = await bookingDisputeService.listForBooking({
      viewerId: req.user!.id,
      viewerRole: "GUEST",
      bookingId: req.params.id as string,
    });
    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Không tìm thấy booking phù hợp." } });
    }
    return res.json({ data: result.data });
  },

  async guestCreate(req: Request, res: Response) {
    const payload = readPayload(req.body);
    const result = await bookingDisputeService.createForBooking({
      viewerId: req.user!.id,
      viewerRole: "GUEST",
      bookingId: req.params.id as string,
      ...payload,
    });
    return respondResult(res, result);
  },

  async hostList(req: Request, res: Response) {
    const result = await bookingDisputeService.listForBooking({
      viewerId: req.user!.id,
      viewerRole: "HOST",
      bookingId: req.params.id as string,
    });
    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Không tìm thấy booking thuộc chỗ nghỉ của bạn." } });
    }
    return res.json({ data: result.data });
  },

  async hostCreate(req: Request, res: Response) {
    const payload = readPayload(req.body);
    const result = await bookingDisputeService.createForBooking({
      viewerId: req.user!.id,
      viewerRole: "HOST",
      bookingId: req.params.id as string,
      ...payload,
    });
    return respondResult(res, result);
  },
};
