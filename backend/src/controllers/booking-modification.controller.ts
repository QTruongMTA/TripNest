import type { Request, Response } from "express";
import { bookingModificationService } from "../services/booking-modification.service";

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

export const bookingModificationController = {

  // ── Guest: request modification ─────────────────────────────────────────────
  async guestRequest(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const { newCheckIn, newCheckOut, newNumGuests } = req.body ?? {};

    const result = await bookingModificationService.requestModification({
      bookingId,
      requestedBy: req.user!.id,
      requesterRole: "GUEST",
      newCheckIn: typeof newCheckIn === "string" ? newCheckIn : null,
      newCheckOut: typeof newCheckOut === "string" ? newCheckOut : null,
      newNumGuests: typeof newNumGuests === "number" ? newNumGuests : null,
    });

    if (result.kind === "BOOKING_NOT_FOUND")      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking không tồn tại." } });
    if (result.kind === "BOOKING_NOT_MODIFIABLE") return res.status(409).json({ error: { code: "BOOKING_NOT_MODIFIABLE", message: "Chỉ có thể yêu cầu thay đổi booking đã xác nhận." } });
    if (result.kind === "CHECKIN_PASSED")         return res.status(409).json({ error: { code: "CHECKIN_PASSED", message: "Không thể thay đổi sau ngày nhận phòng." } });
    if (result.kind === "DUPLICATE_PENDING")      return res.status(409).json({ error: { code: "MODIFICATION_ALREADY_PENDING", message: "Đã có yêu cầu thay đổi đang chờ xử lý." } });
    if (result.kind === "NO_CHANGES")             return res.status(400).json({ error: { code: "NO_CHANGES", message: "Không có thay đổi nào so với booking hiện tại." } });
    if (result.kind === "INVALID_DATE_RANGE")     return res.status(400).json({ error: { code: "INVALID_DATE_RANGE", message: "Ngày nhận phòng phải trước ngày trả phòng." } });
    if (result.kind === "GUEST_LIMIT_EXCEEDED")   return res.status(400).json({ error: { code: "GUEST_LIMIT_EXCEEDED", message: "Số khách vượt quá giới hạn." } });
    if (result.kind === "PROPERTY_UNAVAILABLE")   return res.status(409).json({ error: { code: "PROPERTY_UNAVAILABLE", message: "Chỗ ở không còn trống trong khoảng thời gian đề xuất." } });

    return res.status(201).json({ data: result.data });
  },

  // ── Guest: respond to a host-initiated modification ─────────────────────────
  async guestRespond(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const modificationId = param(req, "modId");
    const { decision, rejectionReason } = req.body ?? {};

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return res.status(400).json({ error: { code: "INVALID_DECISION", message: "decision phải là APPROVED hoặc REJECTED." } });
    }

    const result = await bookingModificationService.respondToModification({
      bookingId,
      modificationId,
      responderId: req.user!.id,
      responderRole: "GUEST",
      decision,
      rejectionReason: typeof rejectionReason === "string" ? rejectionReason : null,
    });

    if (result.kind === "MODIFICATION_NOT_FOUND")    return res.status(404).json({ error: { code: "MODIFICATION_NOT_FOUND", message: "Yêu cầu thay đổi không tồn tại." } });
    if (result.kind === "MODIFICATION_NOT_PENDING")  return res.status(409).json({ error: { code: "MODIFICATION_NOT_PENDING", message: "Yêu cầu này không còn đang chờ xử lý." } });
    if (result.kind === "FORBIDDEN")                 return res.status(403).json({ error: { code: "FORBIDDEN", message: "Không thể phản hồi yêu cầu của chính mình." } });
    if (result.kind === "PROPERTY_UNAVAILABLE")      return res.status(409).json({ error: { code: "PROPERTY_UNAVAILABLE", message: "Chỗ ở không còn trống trong khoảng thời gian đề xuất." } });
    if (result.kind === "BOOKING_NOT_FOUND")         return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking không tồn tại." } });

    return res.json({ data: result.data });
  },

  // ── Guest: cancel own pending modification ──────────────────────────────────
  async guestCancel(req: Request, res: Response) {
    const modificationId = param(req, "modId");

    const result = await bookingModificationService.cancelModification({
      modificationId,
      requestedBy: req.user!.id,
    });

    if (result.kind === "MODIFICATION_NOT_FOUND") {
      return res.status(404).json({ error: { code: "MODIFICATION_NOT_FOUND", message: "Yêu cầu thay đổi không tồn tại hoặc bạn không có quyền." } });
    }

    return res.json({ data: { id: modificationId, status: "CANCELLED" } });
  },

  // ── Guest: list modifications for a booking ─────────────────────────────────
  async guestList(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const mods = await bookingModificationService.listForBooking(bookingId, req.user!.id);
    return res.json({ data: mods });
  },

  // ── Host: request modification ──────────────────────────────────────────────
  async hostRequest(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const { newCheckIn, newCheckOut, newNumGuests } = req.body ?? {};

    const result = await bookingModificationService.requestModification({
      bookingId,
      requestedBy: req.user!.id,
      requesterRole: "HOST",
      newCheckIn: typeof newCheckIn === "string" ? newCheckIn : null,
      newCheckOut: typeof newCheckOut === "string" ? newCheckOut : null,
      newNumGuests: typeof newNumGuests === "number" ? newNumGuests : null,
    });

    if (result.kind === "BOOKING_NOT_FOUND")      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking không tồn tại." } });
    if (result.kind === "BOOKING_NOT_MODIFIABLE") return res.status(409).json({ error: { code: "BOOKING_NOT_MODIFIABLE", message: "Chỉ có thể yêu cầu thay đổi booking đã xác nhận." } });
    if (result.kind === "CHECKIN_PASSED")         return res.status(409).json({ error: { code: "CHECKIN_PASSED", message: "Không thể thay đổi sau ngày nhận phòng." } });
    if (result.kind === "DUPLICATE_PENDING")      return res.status(409).json({ error: { code: "MODIFICATION_ALREADY_PENDING", message: "Đã có yêu cầu thay đổi đang chờ xử lý." } });
    if (result.kind === "NO_CHANGES")             return res.status(400).json({ error: { code: "NO_CHANGES", message: "Không có thay đổi nào so với booking hiện tại." } });
    if (result.kind === "INVALID_DATE_RANGE")     return res.status(400).json({ error: { code: "INVALID_DATE_RANGE", message: "Ngày nhận phòng phải trước ngày trả phòng." } });
    if (result.kind === "GUEST_LIMIT_EXCEEDED")   return res.status(400).json({ error: { code: "GUEST_LIMIT_EXCEEDED", message: "Số khách vượt quá giới hạn." } });
    if (result.kind === "PROPERTY_UNAVAILABLE")   return res.status(409).json({ error: { code: "PROPERTY_UNAVAILABLE", message: "Chỗ ở không còn trống trong khoảng thời gian đề xuất." } });

    return res.status(201).json({ data: result.data });
  },

  // ── Host: respond to a guest-initiated modification ─────────────────────────
  async hostRespond(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const modificationId = param(req, "modId");
    const { decision, rejectionReason } = req.body ?? {};

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return res.status(400).json({ error: { code: "INVALID_DECISION", message: "decision phải là APPROVED hoặc REJECTED." } });
    }

    const result = await bookingModificationService.respondToModification({
      bookingId,
      modificationId,
      responderId: req.user!.id,
      responderRole: "HOST",
      decision,
      rejectionReason: typeof rejectionReason === "string" ? rejectionReason : null,
    });

    if (result.kind === "MODIFICATION_NOT_FOUND")    return res.status(404).json({ error: { code: "MODIFICATION_NOT_FOUND", message: "Yêu cầu thay đổi không tồn tại." } });
    if (result.kind === "MODIFICATION_NOT_PENDING")  return res.status(409).json({ error: { code: "MODIFICATION_NOT_PENDING", message: "Yêu cầu này không còn đang chờ xử lý." } });
    if (result.kind === "FORBIDDEN")                 return res.status(403).json({ error: { code: "FORBIDDEN", message: "Không thể phản hồi yêu cầu của chính mình." } });
    if (result.kind === "PROPERTY_UNAVAILABLE")      return res.status(409).json({ error: { code: "PROPERTY_UNAVAILABLE", message: "Chỗ ở không còn trống trong khoảng thời gian đề xuất." } });
    if (result.kind === "BOOKING_NOT_FOUND")         return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking không tồn tại." } });

    return res.json({ data: result.data });
  },

  // ── Host: cancel own pending modification ───────────────────────────────────
  async hostCancel(req: Request, res: Response) {
    const modificationId = param(req, "modId");

    const result = await bookingModificationService.cancelModification({
      modificationId,
      requestedBy: req.user!.id,
    });

    if (result.kind === "MODIFICATION_NOT_FOUND") {
      return res.status(404).json({ error: { code: "MODIFICATION_NOT_FOUND", message: "Yêu cầu thay đổi không tồn tại hoặc bạn không có quyền." } });
    }

    return res.json({ data: { id: modificationId, status: "CANCELLED" } });
  },
};
