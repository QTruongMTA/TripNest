import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateMiddleware } from "../middlewares/validate.middleware";
import {
  avatarSchema,
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/register", validateMiddleware(registerSchema), authController.register);
router.post("/login", validateMiddleware(loginSchema), authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);
router.patch(
  "/me/avatar",
  authMiddleware,
  validateMiddleware(avatarSchema),
  authController.updateAvatar
);
router.patch(
  "/me/profile",
  authMiddleware,
  validateMiddleware(profileSchema),
  authController.updateProfile
);
router.patch(
  "/me/password",
  authMiddleware,
  validateMiddleware(changePasswordSchema),
  authController.changePassword
);

export { router as authRouter };
