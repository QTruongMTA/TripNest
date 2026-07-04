import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { prisma } from "./lib/prisma";
import { errorMiddleware } from "./middlewares/error.middleware";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware";
import { adminRouter } from "./routes/admin.routes";
import { availabilityRouter } from "./routes/availability.routes";
import { authRouter } from "./routes/auth.routes";
import { bookingRouter } from "./routes/booking.routes";
import { hostRouter } from "./routes/host.routes";
import { notificationRouter } from "./routes/notification.routes";
import { propertyRouter } from "./routes/property.routes";
import { operatorRouter } from "./routes/operator.routes";
import { promotionRouter } from "./routes/promotion.routes";
import { provinceRouter } from "./routes/province.routes";
import { reviewRouter } from "./routes/review.routes";
import { rubyDemoRouter } from "./routes/rubyDemo.routes";
import { tourRouter } from "./routes/tour.routes";

const app = express();

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
};
app.use(
  helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }),
  cors(corsOptions),
  express.json({ limit: "5mb" }),
  rateLimitMiddleware
);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/availability", availabilityRouter);
app.use("/api/v1/properties", propertyRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/host", hostRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/operator", operatorRouter);
app.use("/api/v1/provinces", provinceRouter);
app.use("/api/v1/promotions", promotionRouter);
app.use("/api/v1/ruby-demo", rubyDemoRouter);
app.use(errorMiddleware);
const port = Number(process.env.PORT ?? 5001);
const server = app.listen(port, () =>
  console.log(`TripNest API listening on port ${port}`)
);

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
