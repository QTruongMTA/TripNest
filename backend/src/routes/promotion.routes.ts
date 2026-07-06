import { Router } from "express";
import { promotionController } from "../controllers/promotion.controller";
const router = Router();
router.get("/", (_req, res) => res.json({ data: [] }));
router.post("/validate", promotionController.validatePropertyVoucher);
export { router as promotionRouter };
