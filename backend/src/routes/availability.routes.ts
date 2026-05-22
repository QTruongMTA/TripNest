import { Router } from "express";
import { availabilityController } from "../controllers/availability.controller";

const router = Router();

router.get("/properties/:id", availabilityController.property);
router.get("/tours/:id", availabilityController.tour);

export { router as availabilityRouter };
