import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 300 : 5_000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS" || req.path === "/health",
});
