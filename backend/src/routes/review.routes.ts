import { Router } from "express";
import { reviewController } from "../controllers/review.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/properties/:propertyId", reviewController.property);
router.post("/", authMiddleware, reviewController.submit);
router.get("/host", authMiddleware, requireRole("HOST", "ADMIN"), reviewController.host);
router.post("/:id/respond", authMiddleware, requireRole("HOST", "ADMIN"), reviewController.hostRespond);
router.get("/operator", authMiddleware, requireRole("OPERATOR_PROVINCE", "OPERATOR_SUB"), reviewController.operator);
router.get("/admin", authMiddleware, requireRole("ADMIN"), reviewController.admin);
router.post("/:id/report", authMiddleware, requireRole("ADMIN"), reviewController.report);

export { router as reviewRouter };
