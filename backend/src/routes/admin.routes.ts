import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { operatorController } from "../controllers/operator.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authMiddleware, requireRole("ADMIN"));
router.get("/dashboard", adminController.dashboard);
router.get("/users", adminController.users);
router.get("/users/:id", adminController.userDetail);
router.get("/listings", adminController.overview);
router.post("/listings/properties", adminController.createProperty);
router.post("/listings/tours", adminController.createTour);
router.patch("/listings/:kind/:id/status", adminController.updateListingStatus);
router.delete("/listings/:kind/:id", adminController.deleteListing);
router.get("/bookings", adminController.bookings);
router.patch("/bookings/:id/status", adminController.updateBookingStatus);
router.get("/payments", adminController.payments);
router.get("/revenue", adminController.revenue);
router.get("/promotions", adminController.promotions);
router.get("/commissions", adminController.commissions);
router.get("/reviews", adminController.adminReviews);
router.get("/audit-logs", adminController.auditLogs);

// Operator management (Admin only)
router.get("/operators", operatorController.listOperators);
router.post("/operators/province", operatorController.createOperatorProvince);
router.patch("/operators/:id", operatorController.updateOperator);
router.post("/operators/:id/assign-provinces", operatorController.assignProvinces);

export { router as adminRouter };
