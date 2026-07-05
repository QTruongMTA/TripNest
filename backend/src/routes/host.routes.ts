import { Router } from "express";
import { hostController } from "../controllers/host.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/property-images", authMiddleware, hostController.uploadPropertyImage);
router.post("/properties", authMiddleware, hostController.createProperty);
router.get("/properties", authMiddleware, hostController.listProperties);
router.use(authMiddleware, requireRole("HOST", "ADMIN"));
router.patch("/properties/:id/images", hostController.updatePropertyImages);
router.patch("/properties/:id/details", hostController.updatePropertyDetails);
router.post("/properties/:id/change-requests", hostController.createPropertyChangeRequest);
router.patch("/properties/:id/operational-settings", hostController.updatePropertyOperationalSettings);
router.get("/properties/:id/daily-rates", hostController.listPropertyDailyRates);
router.patch("/properties/:id/daily-rates", hostController.updatePropertyDailyRates);
router.get("/bookings", hostController.listBookings);
router.patch("/bookings/:id/confirm", hostController.confirmBooking);
router.patch("/bookings/:id/cancel", hostController.cancelBooking);

export { router as hostRouter };
