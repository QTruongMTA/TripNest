import { Router } from "express";
import { propertyController } from "../controllers/property.controller";
const router = Router();
router.get("/", propertyController.list);
router.get("/:id", propertyController.detail);
export { router as propertyRouter };
