import { Router } from "express";
import { availabilityController } from "../controllers/availability.controller";

const router = Router();

router.get("/properties/:id", availabilityController.property);

export { router as availabilityRouter };
