import { Router } from "express";
import { reviewController } from "../controllers/review.controller";
const router = Router();
router.get("/", reviewController.list);
export { router as reviewRouter };
