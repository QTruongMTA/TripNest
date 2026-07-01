import type { Request, Response } from "express";
import { bookingMessageService } from "../services/booking-message.service";

function param(req: Request, key: string): string {
  return req.params[key] as string;
}

export const bookingMessageController = {

  // ── Guest: list messages ─────────────────────────────────────────────────
  async guestList(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const messages = await bookingMessageService.listAndMarkRead(bookingId, req.user!.id, "GUEST");
    if (messages === null) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking không tồn tại." } });
    return res.json({ data: messages });
  },

  // ── Guest: send message ──────────────────────────────────────────────────
  async guestSend(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const { message } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: { code: "EMPTY_MESSAGE", message: "Tin nhắn không được trống." } });
    }
    const result = await bookingMessageService.sendMessage(bookingId, req.user!.id, "GUEST", message);
    if (result.kind === "NOT_FOUND") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking không tồn tại." } });
    return res.status(201).json({ data: result.data });
  },

  // ── Host: list messages ──────────────────────────────────────────────────
  async hostList(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const messages = await bookingMessageService.listAndMarkRead(bookingId, req.user!.id, "HOST");
    if (messages === null) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking không tồn tại." } });
    return res.json({ data: messages });
  },

  // ── Host: send message ───────────────────────────────────────────────────
  async hostSend(req: Request, res: Response) {
    const bookingId = param(req, "id");
    const { message } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: { code: "EMPTY_MESSAGE", message: "Tin nhắn không được trống." } });
    }
    const result = await bookingMessageService.sendMessage(bookingId, req.user!.id, "HOST", message);
    if (result.kind === "NOT_FOUND") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking không tồn tại." } });
    return res.status(201).json({ data: result.data });
  },
};
