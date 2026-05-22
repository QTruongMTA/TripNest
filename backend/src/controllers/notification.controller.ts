import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";

export const notificationController = {
  async listMine(req: Request, res: Response) {
    const [items, unreadCount] = await Promise.all([
      notificationService.listMine(req.user!.id),
      notificationService.unreadCount(req.user!.id),
    ]);

    return res.json({ data: { items, unreadCount } });
  },

  async markAsRead(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_NOTIFICATION_ID",
          message: "Notification id is required",
        },
      });
    }

    const result = await notificationService.markAsRead(req.user!.id, id);

    if (result.kind === "NOTIFICATION_NOT_FOUND") {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(req.user!.id);
    return res.status(204).send();
  },
};
