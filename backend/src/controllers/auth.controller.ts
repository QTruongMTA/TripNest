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

  async verifyEmail(req: Request, res: Response) {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.status(400).json({ error: { code: "MISSING_TOKEN", message: "Token xác thực bị thiếu." } });
    }
    const result = await authService.verifyEmail(token);
    if (result.kind === "INVALID_TOKEN") {
      return res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Link xác thực không hợp lệ." } });
    }
    if (result.kind === "TOKEN_EXPIRED") {
      return res.status(410).json({ error: { code: "TOKEN_EXPIRED", message: "Link xác thực đã hết hạn. Vui lòng yêu cầu gửi lại." } });
    }
    return res.json({ data: { message: "Email đã được xác thực thành công." } });
  },

  async resendVerification(req: Request, res: Response) {
    const result = await authService.resendVerification(req.user!.id);
    if (result.kind === "NOT_FOUND") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy tài khoản." } });
    }
    if (result.kind === "ALREADY_VERIFIED") {
      return res.json({ data: { message: "Email đã được xác thực." } });
    }
    return res.json({ data: { message: "Email xác thực đã được gửi lại." } });
  },
};
