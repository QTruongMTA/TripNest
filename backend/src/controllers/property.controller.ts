import type { Request, Response } from "express";
import { CancellationPolicy, PropertyType } from "../generated/prisma/enums";
import { propertyService } from "../services/property.service";

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

function parseIsoDate(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStringList(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

export const propertyController = {
  async list(req: Request, res: Response) {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parsePositiveInteger(req.query.limit, 12);
    const minPrice = parseNonNegativeNumber(req.query.minPrice);
    const maxPrice = parseNonNegativeNumber(req.query.maxPrice);
    const guests = parsePositiveInteger(req.query.guests, 0);
    const bedrooms = parsePositiveInteger(req.query.bedrooms, 0);
    const bathrooms = parsePositiveInteger(req.query.bathrooms, 0);
    const checkIn = parseIsoDate(req.query.checkIn);
    const checkOut = parseIsoDate(req.query.checkOut);
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const amenities = parseStringList(req.query.amenities);
    const type =
      typeof req.query.type === "string" &&
      Object.values(PropertyType).includes(req.query.type as PropertyType)
        ? (req.query.type as PropertyType)
        : req.query.type === undefined
          ? undefined
          : null;
    const cancellationPolicy =
      typeof req.query.cancellationPolicy === "string" &&
      Object.values(CancellationPolicy).includes(
        req.query.cancellationPolicy as CancellationPolicy
      )
        ? (req.query.cancellationPolicy as CancellationPolicy)
        : req.query.cancellationPolicy === undefined
          ? undefined
          : null;

    if (
      page === null ||
      limit === null ||
      minPrice === null ||
      maxPrice === null ||
      guests === null ||
      bedrooms === null ||
      bathrooms === null ||
      checkIn === null ||
      checkOut === null ||
      (checkIn === undefined) !== (checkOut === undefined) ||
      type === null ||
      cancellationPolicy === null ||
      (checkIn !== undefined &&
        checkOut !== undefined &&
        (checkIn >= checkOut || checkIn < today)) ||
      (minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid property query parameters",
        },
      });
    }

    const result = await propertyService.listPublicProperties({
      page,
      limit: Math.min(limit, 50),
      ...(typeof req.query.city === "string" && req.query.city.trim()
        ? { city: req.query.city.trim() }
        : {}),
      ...(typeof req.query.cities === "string" && req.query.cities.trim()
        ? {
            cities: req.query.cities
              .split(",")
              .map((city) => city.trim())
              .filter(Boolean),
          }
        : {}),
      ...(type ? { type } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(guests ? { guests } : {}),
      ...(bedrooms ? { bedrooms } : {}),
      ...(bathrooms ? { bathrooms } : {}),
      ...(checkIn ? { checkIn } : {}),
      ...(checkOut ? { checkOut } : {}),
      ...(amenities?.length ? { amenities } : {}),
      ...(cancellationPolicy ? { cancellationPolicy } : {}),
    });

    return res.json(result);
  },

  async detail(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Property id is required",
        },
      });
    }

    const property = await propertyService.getPublicPropertyById(id);

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    return res.json({ data: property });
  },
};
