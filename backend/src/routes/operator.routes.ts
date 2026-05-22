import { Router } from "express";
import { operatorController } from "../controllers/operator.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();
const operatorRoles = ["OPERATOR_PROVINCE", "OPERATOR_SUB"];
const provinceOnly = ["OPERATOR_PROVINCE"];

router.use(authMiddleware, requireRole(...operatorRoles));

router.get("/dashboard", operatorController.dashboard);
router.get("/provinces", operatorController.provinces);
router.get("/listings", operatorController.listings);
router.patch("/listings/:id/status", requireRole(...provinceOnly), operatorController.updateListingStatus);

router.get("/host-approvals", operatorController.hostApprovals);
router.post("/host-approvals/:id/approve", requireRole(...provinceOnly), operatorController.approveHost);
router.post("/host-approvals/:id/reject", requireRole(...provinceOnly), operatorController.rejectHost);

router.get("/sub-operators", requireRole(...provinceOnly), operatorController.subOperators);
router.post("/sub-operators", requireRole(...provinceOnly), operatorController.createSubOperator);

router.get("/tasks", operatorController.tasks);
router.post("/tasks", requireRole(...provinceOnly), operatorController.createTask);
router.patch("/tasks/:id", operatorController.updateTask);

router.get("/disputes", operatorController.disputes);
router.patch("/disputes/:id/resolve", requireRole(...provinceOnly), operatorController.resolveDispute);

export { router as operatorRouter };
