import { Router } from "express";
import { bookingController } from "../controllers/booking.controller";
import { bookingMessageController } from "../controllers/booking-message.controller";
import { bookingModificationController } from "../controllers/booking-modification.controller";
import { bookingDisputeController } from "../controllers/booking-dispute.controller";
import { paymentController } from "../controllers/payment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireEmailVerified } from "../middlewares/requireEmailVerified.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import { createPropertyBookingSchema } from "../validators/booking.validator";

const router = Router();

router.get("/mine", authMiddleware, bookingController.listMine);
router.post(
  "/property",
  authMiddleware,
  requireEmailVerified,
  validateMiddleware(createPropertyBookingSchema),
  bookingController.createProperty
);
router.get("/:id", authMiddleware, bookingController.getDetail);
router.patch("/:id/cancel", authMiddleware, bookingController.cancelGuest);

// Message routes (guest)
router.patch("/:id/payment/mark-transferred", authMiddleware, requireEmailVerified, paymentController.guestMarkTransferred);

router.get("/:id/messages",  authMiddleware, bookingMessageController.guestList);
router.post("/:id/messages", authMiddleware, requireEmailVerified, bookingMessageController.guestSend);

// Support case / dispute routes (guest)
router.get("/:id/disputes", authMiddleware, bookingDisputeController.guestList);
router.post("/:id/disputes", authMiddleware, requireEmailVerified, bookingDisputeController.guestCreate);

// Modification routes (guest)
router.post("/:id/modifications", authMiddleware, bookingModificationController.guestRequest);
router.get("/:id/modifications", authMiddleware, bookingModificationController.guestList);
router.patch("/:id/modifications/:modId/respond", authMiddleware, bookingModificationController.guestRespond);
router.delete("/:id/modifications/:modId", authMiddleware, bookingModificationController.guestCancel);

export { router as bookingRouter };
