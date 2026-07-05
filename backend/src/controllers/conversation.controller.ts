import type { Request, Response } from "express";
import { conversationService } from "../services/conversation.service";

function notFound(res: Response) {
  return res.status(404).json({ error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } });
}

export const conversationController = {
  async listMine(req: Request, res: Response) {
    const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : undefined;
    const [items, unreadCount] = await Promise.all([
      conversationService.listMine(req.user!.id, propertyId),
      conversationService.unreadCount(req.user!.id),
    ]);
    return res.json({ data: { items, unreadCount } });
  },

  async start(req: Request, res: Response) {
    const propertyId = req.body?.propertyId;
    if (typeof propertyId !== "string" || !propertyId) {
      return res.status(400).json({ error: { code: "INVALID_PROPERTY_ID", message: "propertyId is required" } });
    }
    const result = await conversationService.start(req.user!.id, propertyId);
    if (result.kind === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({ error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" } });
    }
    if (result.kind === "CANNOT_MESSAGE_SELF") {
      return res.status(409).json({ error: { code: "CANNOT_MESSAGE_SELF", message: "Cannot start a conversation with your own property" } });
    }
    return res.status(201).json({ data: result.data });
  },

  async get(req: Request, res: Response) {
    const result = await conversationService.get(req.user!.id, req.params.id as string);
    if (result.kind === "CONVERSATION_NOT_FOUND") return notFound(res);
    return res.json({ data: result.data });
  },

  async markRead(req: Request, res: Response) {
    const result = await conversationService.markRead(req.user!.id, req.params.id as string);
    if (result.kind === "CONVERSATION_NOT_FOUND") return notFound(res);
    return res.status(204).send();
  },

  async send(req: Request, res: Response) {
    const result = await conversationService.send(req.user!.id, req.params.id as string, {
      body: req.body?.body,
      imageUrl: req.body?.imageUrl,
    });
    if (result.kind === "CONVERSATION_NOT_FOUND") return notFound(res);
    if (result.kind === "EMPTY_MESSAGE") {
      return res.status(400).json({ error: { code: "EMPTY_MESSAGE", message: "Message body or imageUrl is required" } });
    }
    return res.status(201).json({ data: result.data });
  },

  async hide(req: Request, res: Response) {
    const result = await conversationService.hide(req.user!.id, req.params.id as string);
    if (result.kind === "CONVERSATION_NOT_FOUND") return notFound(res);
    return res.status(204).send();
  },
};
