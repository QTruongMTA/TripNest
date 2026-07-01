import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { expireUnpaidBookings } from "../jobs/expire-bookings.job";
import { operatorController } from "../controllers/operator.controller";
import { paymentController } from "../controllers/payment.controller";
import { payoutController } from "../controllers/payout.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authMiddleware, requireRole("ADMIN"));
router.get("/dashboard", adminController.dashboard);
router.get("/users", adminController.users);
router.get("/users/:id", adminController.userDetail);
router.get("/listings", adminController.overview);
router.post("/listings/properties", adminController.createProperty);
router.patch("/listings/:kind/:id/status", adminController.updateListingStatus);
router.delete("/listings/:kind/:id", adminController.deleteListing);
router.get("/bookings", adminController.bookings);
router.patch("/bookings/:id/status", adminController.updateBookingStatus);
router.get("/payments", adminController.payments);
router.patch("/payments/:id/confirm", paymentController.adminConfirmPayment);
router.get("/payouts", payoutController.adminListPayouts);
router.patch("/payouts/:id/confirm", payoutController.adminConfirmPayout);
router.patch("/payouts/:id/adjust", payoutController.adminAdjustPayout);
router.get("/promotions", adminController.promotions);
router.get("/commissions", adminController.commissions);
router.get("/reviews", adminController.adminReviews);
router.get("/audit-logs", adminController.auditLogs);

// Operator management (Admin only)
router.get("/operators", operatorController.listOperators);
router.post("/operators/province", operatorController.createOperatorProvince);
router.patch("/operators/:id", operatorController.updateOperator);
router.post("/operators/:id/assign-provinces", operatorController.assignProvinces);

// Jobs (manual trigger for testing / ops)
router.post("/jobs/expire-bookings", async (_req, res) => {
  const result = await expireUnpaidBookings();
  res.json({ data: result });
});

export { router as adminRouter };
