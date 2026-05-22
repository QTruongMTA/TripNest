import { Router } from "express";
import { provinceController } from "../controllers/province.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

// Public: list tỉnh (dùng cho dropdown)
router.get("/", provinceController.list);
router.get("/available", authMiddleware, requireRole("ADMIN"), provinceController.listAvailable);
router.get("/:id", provinceController.get);

// Admin only
router.post("/", authMiddleware, requireRole("ADMIN"), provinceController.create);
router.patch("/:id", authMiddleware, requireRole("ADMIN"), provinceController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), provinceController.delete);

export { router as provinceRouter };
