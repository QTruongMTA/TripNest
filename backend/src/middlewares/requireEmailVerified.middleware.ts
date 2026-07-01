import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export async function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Chưa đăng nhập." } });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    return res.status(403).json({
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Vui lòng xác thực email trước khi thực hiện thao tác này.",
      },
    });
  }

  return next();
}
