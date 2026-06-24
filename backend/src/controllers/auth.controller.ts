import type { Request, Response } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);

    if (result.kind === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email already exists",
        },
      });
    }

    return res.status(201).json({ data: result.data });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);

    if (result.kind === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async me(req: Request, res: Response) {
    const user = await authService.getCurrentUser(req.user!.id);

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({ data: user });
  },

  async refresh(req: Request, res: Response) {
    const session = await authService.refreshSession(req.user!.id);

    if (!session) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({ data: session });
  },

  async updateAvatar(req: Request, res: Response) {
    const user = await authService.updateAvatar(req.user!.id, req.body.avatar ?? null);
    return res.json({ data: user });
  },

  async updateProfile(req: Request, res: Response) {
    const user = await authService.updateProfile(req.user!.id, req.body);
    return res.json({ data: user });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body.password);
    return res.json({ data: { message: "Mật khẩu đã được thay đổi" } });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.user!.id);
    return res.json({ data: { message: "Logged out" } });
  },
};
