import { Router } from "express";
import { hostController } from "../controllers/host.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

// Image upload helper (no role guard — any authenticated user preparing a create)
router.post("/property-images", authMiddleware, hostController.uploadPropertyImage);

// Property CRUD (auth only — createProperty upgrades role to HOST on success)
router.post("/properties", authMiddleware, hostController.createProperty);
router.get("/properties", authMiddleware, hostController.listProperties);

// All routes below require HOST or ADMIN
router.use(authMiddleware, requireRole("HOST", "ADMIN"));

// Property manage
router.get("/properties/:id", hostController.getProperty);
router.patch("/properties/:id/info", hostController.updatePropertyInfo);
router.patch("/properties/:id/pricing", hostController.updatePropertyPricing);
router.patch("/properties/:id/policies", hostController.updatePropertyPolicies);
router.patch("/properties/:id/status", hostController.togglePropertyStatus);

// Availability calendar
router.get("/properties/:id/calendar", hostController.getCalendar);
router.post("/properties/:id/availability/block", hostController.blockDates);
router.delete("/properties/:id/availability/unblock", hostController.unblockDates);

// Property image management
router.post("/properties/:id/images", hostController.addPropertyImage);
router.delete("/properties/:id/images/:imageId", hostController.deletePropertyImage);
router.patch("/properties/:id/images/:imageId/primary", hostController.setPrimaryImage);

// Booking management
router.get("/bookings", hostController.listBookings);
router.patch("/bookings/:id/confirm", hostController.confirmBooking);
router.patch("/bookings/:id/cancel", hostController.cancelBooking);

export { router as hostRouter };
