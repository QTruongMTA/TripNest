import type { Request, Response } from "express";
import { availabilityService } from "../services/availability.service";

function parseDateOnly(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parsePositiveInteger(value: unknown, fallback?: number) {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const availabilityController = {
  async property(req: Request, res: Response) {
    const { id } = req.params;
    const checkIn = parseDateOnly(req.query.checkIn);
    const checkOut = parseDateOnly(req.query.checkOut);
    const guests = parsePositiveInteger(req.query.guests, 1);

    if (
      typeof id !== "string" ||
      !id ||
      !checkIn ||
      !checkOut ||
      guests === null ||
      checkOut <= checkIn
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid property availability query parameters",
        },
      });
    }

    const result = await availabilityService.checkPropertyAvailability({
      propertyId: id,
      checkIn,
      checkOut,
      guests,
    });

    if (!result) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    return res.json({ data: result });
  },
};
