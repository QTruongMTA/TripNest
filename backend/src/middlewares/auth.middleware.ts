import type { NextFunction, Request, Response } from "express";
import { sessionService } from "../services/session.service";
import { verifyAccessToken } from "../utils/jwt.utils";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  try {
    const token = authorization.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    sessionService.markActive(payload.sub);

    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired access token",
      },
    });
  }
}
