import { Router } from "express";
import { hostController } from "../controllers/host.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/properties", authMiddleware, hostController.createProperty);
router.use(authMiddleware, requireRole("HOST", "ADMIN"));
router.get("/bookings", hostController.listBookings);
router.patch("/bookings/:id/confirm", hostController.confirmBooking);
router.patch("/bookings/:id/cancel", hostController.cancelBooking);

export { router as hostRouter };
