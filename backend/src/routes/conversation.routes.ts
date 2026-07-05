import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", conversationController.listMine);
router.post("/", conversationController.start);
router.get("/:id", conversationController.get);
router.patch("/:id/read", conversationController.markRead);
router.post("/:id/messages", conversationController.send);
router.delete("/:id", conversationController.hide);

export { router as conversationRouter };
