import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/mine", notificationController.listMine);
router.patch("/mine/:id/read", notificationController.markAsRead);
router.patch("/mine/read-all", notificationController.markAllAsRead);

export { router as notificationRouter };
