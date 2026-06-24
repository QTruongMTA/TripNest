import { Router } from "express";
import { reviewController } from "../controllers/review.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import Joi from "joi";

const router = Router();
router.get("/property/:propertyId", reviewController.listProperty);
router.post(
  "/",
  authMiddleware,
  validateMiddleware(
    Joi.object({
      bookingId: Joi.string().required(),
      cleanlinessRating: Joi.number().integer().min(1).max(5).required(),
      locationRating: Joi.number().integer().min(1).max(5).required(),
      serviceRating: Joi.number().integer().min(1).max(5).required(),
      valueRating: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().trim().min(10).max(2000).required(),
    })
  ),
  reviewController.create
);
export { router as reviewRouter };
