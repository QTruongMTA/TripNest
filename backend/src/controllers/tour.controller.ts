import type { Request, Response } from "express";
import { TourCategory } from "../generated/prisma/enums";
import { tourService } from "../services/tour.service";

function parsePositiveInteger(value: unknown, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeNumber(value: unknown) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export const tourController = {
  async list(req: Request, res: Response) {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 12);
    const minPrice = parseNonNegativeNumber(req.query.minPrice);
    const maxPrice = parseNonNegativeNumber(req.query.maxPrice);
    const minDuration = parsePositiveInteger(req.query.minDuration, 0);
    const maxDuration = parsePositiveInteger(req.query.maxDuration, 0);
    const category =
      typeof req.query.category === "string" &&
      Object.values(TourCategory).includes(req.query.category as TourCategory)
        ? (req.query.category as TourCategory)
        : req.query.category === undefined
          ? undefined
          : null;

    if (
      page === null ||
      limit === null ||
      minPrice === null ||
      maxPrice === null ||
      minDuration === null ||
      maxDuration === null ||
      category === null ||
      (minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice) ||
      (minDuration &&
        maxDuration &&
        minDuration > maxDuration)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid tour query parameters",
        },
      });
    }

    const result = await tourService.listPublicTours({
      page,
      limit: Math.min(limit, 50),
      ...(typeof req.query.city === "string" && req.query.city.trim()
        ? { city: req.query.city.trim() }
        : {}),
      ...(category ? { category } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minDuration ? { minDuration } : {}),
      ...(maxDuration ? { maxDuration } : {}),
    });

    return res.json(result);
  },

  async detail(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_TOUR_ID",
          message: "Tour id is required",
        },
      });
    }

    const tour = await tourService.getPublicTourById(id);

    if (!tour) {
      return res.status(404).json({
        error: {
          code: "TOUR_NOT_FOUND",
          message: "Tour not found",
        },
      });
    }

    return res.json({ data: tour });
  },
};
