import { Router } from "express";
import { hostController } from "../controllers/host.controller";
import { bookingMessageController } from "../controllers/booking-message.controller";
import { bookingModificationController } from "../controllers/booking-modification.controller";
import { bookingDisputeController } from "../controllers/booking-dispute.controller";
import { paymentController } from "../controllers/payment.controller";
import { revenueController } from "../controllers/revenue.controller";
import { payoutController } from "../controllers/payout.controller";
import { hostPromotionController } from "../controllers/host-promotion.controller";
import { requireEmailVerified } from "../middlewares/requireEmailVerified.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

// Image upload helper (no role guard — any authenticated user preparing a create)
router.post("/property-images", authMiddleware, hostController.uploadPropertyImage);

// Property CRUD (auth only — createProperty upgrades role to HOST on success)
router.post("/properties", authMiddleware, requireEmailVerified, hostController.createProperty);
router.get("/properties", authMiddleware, hostController.listProperties);

// All routes below require HOST only
router.use(authMiddleware, requireRole("HOST"));

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

// Daily rate management
router.put("/properties/:id/daily-rates", hostController.setDailyRates);

// Rate plan management
router.get("/properties/:id/rate-plans", hostController.listRatePlans);
router.post("/properties/:id/rate-plans", hostController.createRatePlan);
router.put("/properties/:id/rate-plans/:planId", hostController.updateRatePlan);
router.patch("/properties/:id/rate-plans/:planId/toggle", hostController.toggleRatePlan);
router.delete("/properties/:id/rate-plans/:planId", hostController.deleteRatePlan);

// Property image management
router.post("/properties/:id/images", hostController.addPropertyImage);
router.delete("/properties/:id/images/:imageId", hostController.deletePropertyImage);
router.patch("/properties/:id/images/:imageId/primary", hostController.setPrimaryImage);

// Revenue & payouts
router.get("/revenue", revenueController.getHostRevenue);
router.get("/payouts", payoutController.listHostPayouts);

// Promotion management
router.get("/promotions", hostPromotionController.list);
router.post("/promotions", requireEmailVerified, hostPromotionController.create);
router.put("/promotions/:id", requireEmailVerified, hostPromotionController.update);
router.patch("/promotions/:id/toggle", requireEmailVerified, hostPromotionController.toggle);
router.delete("/promotions/:id", requireEmailVerified, hostPromotionController.remove);

// Booking management
router.get("/bookings", hostController.listBookings);
router.get("/bookings/:id", hostController.getBookingDetail);
router.patch("/bookings/:id/confirm", hostController.confirmBooking);
router.patch("/bookings/:id/cancel", hostController.cancelBooking);
router.patch("/bookings/:id/no-show", hostController.noShowBooking);
router.patch("/bookings/:id/complete", hostController.completeBooking);

// Payment
router.patch("/bookings/:id/payment/confirm", paymentController.hostConfirmPayment);

// Message routes (host)
router.get("/bookings/:id/messages",  bookingMessageController.hostList);
router.post("/bookings/:id/messages", requireEmailVerified, bookingMessageController.hostSend);

// Support case / dispute routes (host)
router.get("/bookings/:id/disputes", bookingDisputeController.hostList);
router.post("/bookings/:id/disputes", requireEmailVerified, bookingDisputeController.hostCreate);

// Modification routes (host)
router.post("/bookings/:id/modifications", requireEmailVerified, bookingModificationController.hostRequest);
router.patch("/bookings/:id/modifications/:modId/respond", bookingModificationController.hostRespond);
router.delete("/bookings/:id/modifications/:modId", bookingModificationController.hostCancel);

export { router as hostRouter };
