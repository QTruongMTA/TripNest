import { Router } from "express";
import { hostController } from "../controllers/host.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/property-images", authMiddleware, hostController.uploadPropertyImage);
router.post("/properties", authMiddleware, hostController.createProperty);
router.get("/properties", authMiddleware, hostController.listProperties);
router.get("/profile-request", authMiddleware, hostController.getProfileRequest);
router.post("/profile-request", authMiddleware, hostController.submitProfileRequest);
router.use(authMiddleware, requireRole("HOST", "ADMIN"));
router.get("/bookings", hostController.listBookings);
router.patch("/bookings/:id/confirm", hostController.confirmBooking);
router.patch("/bookings/:id/cancel", hostController.cancelBooking);
router.patch("/bookings/:id/check-in", hostController.checkInBooking);
router.patch("/bookings/:id/check-out", hostController.checkOutBooking);
router.post("/bookings/:id/payment", hostController.confirmPayment);
router.get("/finance", hostController.finance);
router.get("/reviews", hostController.reviews);

export { router as hostRouter };
