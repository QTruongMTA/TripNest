import { Router } from "express";
import { tourController } from "../controllers/tour.controller";

const router = Router();

router.get("/", tourController.list);
router.get("/:id", tourController.detail);

export { router as tourRouter };
