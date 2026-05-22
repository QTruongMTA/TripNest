import { Router } from "express";
import { bookingController } from "../controllers/booking.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { createPropertyBookingSchema } from "../validators/booking.validator";

const router = Router();

router.get("/mine", authMiddleware, bookingController.listMine);
router.post(
  "/property",
  authMiddleware,
  validateMiddleware(createPropertyBookingSchema),
  bookingController.createProperty
);

export { router as bookingRouter };
