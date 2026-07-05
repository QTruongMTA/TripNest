import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { bookingService } from "../services/booking.service";
import { prisma } from "../lib/prisma";
import { BookingMethod, CancellationPolicy, ParkingType, PetPolicy, PropertyType } from "../generated/prisma/enums";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

const MIN_PROPERTY_IMAGES = 8;
const TIME_PATTERN = /^([01]\d|2[0-3]):00$/;

function parseStringList(value: unknown, fallback: string[]) {
  const items = Array.isArray(value)
    ? value
        .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item: string) => item.trim())
    : [];

  return Array.from(new Set(items.length ? items : fallback));
}

function parseTime(value: unknown, fallback: string) {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : fallback;
}

function parseBookingMethod(value: unknown) {
  return value === "request" || value === BookingMethod.REQUEST ? BookingMethod.REQUEST : BookingMethod.INSTANT;
}

function parsePetPolicy(value: unknown) {
  if (value === "yes" || value === PetPolicy.ALLOWED) return PetPolicy.ALLOWED;
  if (value === "request" || value === PetPolicy.ON_REQUEST) return PetPolicy.ON_REQUEST;
  return PetPolicy.NOT_ALLOWED;
}

function parseParkingType(value: unknown) {
  if (value === "free" || value === ParkingType.FREE) return ParkingType.FREE;
  if (value === "paid" || value === ParkingType.PAID) return ParkingType.PAID;
  return ParkingType.NOT_AVAILABLE;
}

function parseInteger(value: unknown, fallback: number, min = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(min, Math.floor(numericValue));
}

function parseSizeM2(value: unknown, details: Record<string, unknown>) {
  const explicitSize = Number(value);
  if (Number.isFinite(explicitSize) && explicitSize > 0) return explicitSize;

  const numericSize = Number(details.size);
  if (!Number.isFinite(numericSize) || numericSize <= 0) return undefined;
  return details.sizeUnit === "ft2" ? numericSize * 0.092903 : numericSize;
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBedrooms(value: unknown) {
  const bedrooms = Array.isArray(value) ? value : [];
  const parsedBedrooms = bedrooms
    .map((item, index) => {
      const bedroom = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
      const beds = typeof bedroom.beds === "object" && bedroom.beds !== null ? bedroom.beds as Record<string, unknown> : {};

      return {
        roomNumber: index + 1,
        singleBeds: parseInteger(beds.single, 0),
        doubleBeds: parseInteger(beds.double, 0),
        kingBeds: parseInteger(beds.king, 0),
        superKingBeds: parseInteger(beds.superKing, 0),
        bunkBeds: parseInteger(beds.bunk, 0),
        sofaBeds: parseInteger(beds.sofa, 0),
        futonBeds: parseInteger(beds.futon, 0),
      };
    })
    .filter((bedroom) =>
      bedroom.singleBeds +
      bedroom.doubleBeds +
      bedroom.kingBeds +
      bedroom.superKingBeds +
      bedroom.bunkBeds +
      bedroom.sofaBeds +
      bedroom.futonBeds > 0
    );

  return parsedBedrooms.length
    ? parsedBedrooms
    : [{ roomNumber: 1, singleBeds: 0, doubleBeds: 1, kingBeds: 0, superKingBeds: 0, bunkBeds: 0, sofaBeds: 0, futonBeds: 0 }];
}

type PropertyFaq = {
  id: string;
  question: string;
  answer: string;
};

function parseFaqs(value: unknown): PropertyFaq[] {
  const faqs = Array.isArray(value) ? value : [];

  return faqs
    .map((item, index) => {
      const faq = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
      const question = typeof faq.question === "string" ? faq.question.trim() : "";
      const answer = typeof faq.answer === "string" ? faq.answer.trim() : "";

      return {
        id: typeof faq.id === "string" && faq.id.trim() ? faq.id.trim() : `faq-${index + 1}`,
        question,
        answer,
      };
    })
    .filter((faq) => faq.question || faq.answer);
}

export const hostController = {
  async uploadPropertyImage(req: Request, res: Response) {
    const imageData = req.body?.imageData;

    if (typeof imageData !== "string") {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_PAYLOAD",
          message: "imageData is required",
        },
      });
    }

    const match = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_FORMAT",
          message: "Only jpeg, png, and webp images are supported",
        },
      });
    }

    const mimeExtension = match[1];
    const base64Payload = match[2];
    if (!mimeExtension || !base64Payload) {
      return res.status(400).json({
        error: {
          code: "INVALID_IMAGE_FORMAT",
          message: "Invalid image payload",
        },
      });
    }

    const extension = mimeExtension === "jpeg" ? "jpg" : mimeExtension;
    const buffer = Buffer.from(base64Payload, "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "Image must be 4MB or smaller after compression",
        },
      });
    }

    const uploadDir = path.join(process.cwd(), "uploads", "properties");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/properties/${filename}`;
    return res.status(201).json({ data: { url: publicUrl } });
  },

  async createProperty(req: Request, res: Response) {
    const body = req.body ?? {};

    if (
      typeof body.title !== "string" ||
      typeof body.addressLine1 !== "string" ||
      typeof body.city !== "string" ||
      typeof body.pricePerNight !== "number" ||
      typeof body.maxGuests !== "number" ||
      typeof body.bathrooms !== "number" ||
      !Object.values(PropertyType).includes(body.type)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_PAYLOAD",
          message: "Invalid property payload",
        },
      });
    }

    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
      : [];
    const normalizedImageUrls: string[] = (
      imageUrls.length
        ? imageUrls.map((url: string) => normalizePropertyImageUrl(url, body.type))
        : [normalizePropertyImageUrl(body.thumbnailUrl, body.type)]
    ).filter((url): url is string => typeof url === "string" && url.length > 0);
    const amenityNames: string[] = Array.isArray(body.amenities)
      ? Array.from(
          new Set(
            body.amenities
              .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
              .map((name: string) => name.trim())
          )
        )
      : [];
    const languageNames = parseStringList(body.languages, ["Tiếng Việt"]);
    const rules = typeof body.rules === "object" && body.rules !== null ? body.rules as Record<string, unknown> : {};
    const services = typeof body.services === "object" && body.services !== null ? body.services as Record<string, unknown> : {};
    const details = typeof body.details === "object" && body.details !== null ? body.details as Record<string, unknown> : {};
    const bedrooms = parseBedrooms(details.bedrooms);
    const sizeM2 = parseSizeM2(body.sizeM2, details);

    if (normalizedImageUrls.length < MIN_PROPERTY_IMAGES) {
      return res.status(400).json({
        error: {
          code: "NOT_ENOUGH_PROPERTY_IMAGES",
          message: `Please upload at least ${MIN_PROPERTY_IMAGES} real property images`,
        },
      });
    }

    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          title: body.title.trim(),
          description: typeof body.description === "string" ? body.description.trim() : null,
          addressLine1: body.addressLine1.trim(),
          addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2.trim() : null,
          city: body.city.trim(),
          postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() : null,
          country: typeof body.country === "string" ? body.country.trim() : "Việt Nam",
          ...(typeof body.latitude === "number" ? { latitude: body.latitude } : {}),
          ...(typeof body.longitude === "number" ? { longitude: body.longitude } : {}),
          pricePerNight: body.pricePerNight,
          ...(typeof body.cleaningFee === "number" ? { cleaningFee: body.cleaningFee } : {}),
          maxGuests: body.maxGuests,
          bedroomCount: bedrooms.length,
          bathrooms: body.bathrooms,
          livingRoomSofaBeds: parseInteger(details.livingBeds, 0),
          childrenAllowed: details.children !== false,
          cribsAvailable: details.cribs === true,
          ...(sizeM2 !== undefined ? { sizeM2 } : {}),
          type: body.type,
          breakfastIncluded: services.breakfast === "yes",
          parkingType: parseParkingType(services.parking),
          bookingMethod: parseBookingMethod(body.bookingMethod),
          smokingAllowed: rules.smoking === true,
          partiesAllowed: rules.parties === true,
          petsPolicy: parsePetPolicy(rules.pets),
          checkInFrom: parseTime(rules.checkInFrom, "15:00"),
          checkInTo: parseTime(rules.checkInTo, "18:00"),
          checkOutFrom: parseTime(rules.checkOutFrom, "08:00"),
          checkOutTo: parseTime(rules.checkOutTo, "11:00"),
          hostId: req.user!.id,
          status: "PENDING",
          images: {
            create: normalizedImageUrls.map((url: string, index: number) => ({
              url,
              isPrimary: index === 0,
            })),
          },
          ...(amenityNames.length
            ? {
                amenities: {
                  connectOrCreate: amenityNames.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                },
              }
            : {}),
          languages: {
            create: languageNames.map((language) => ({ language })),
          },
          bedrooms: {
            create: bedrooms,
          },
        },
      });

      await tx.user.update({
        where: { id: req.user!.id },
        data: { role: "HOST" },
      });

      const province = await tx.province.findUnique({
        where: { name: body.city.trim() },
        select: { id: true, name: true },
      });
      const assignments = province
        ? await tx.operatorProvinceAssignment.findMany({
            where: { provinceId: province.id, operator: { isActive: true } },
            select: { operatorId: true },
          })
        : [];

      if (assignments.length > 0) {
        await tx.notification.createMany({
          data: assignments.map((assignment) => ({
            userId: assignment.operatorId,
            type: "SYSTEM",
            title: "Yêu cầu duyệt cơ sở lưu trú mới",
            message: `${created.title} tại ${created.city} vừa được gửi để xét duyệt trước khi mở nhận đặt phòng.`,
            metadata: {
              propertyId: created.id,
              action: "PROPERTY_APPROVAL_REQUESTED",
            },
          })),
        });
      }

      return created;
    });

    return res.status(201).json({ data: property });
  },

  async updatePropertyImages(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Property id is required",
        },
      });
    }

    const imageUrls: string[] = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
      : [];

    if (imageUrls.length < 1) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_IMAGES",
          message: "At least 1 image url is required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true, type: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const normalizedImageUrls = imageUrls
      .map((url) => normalizePropertyImageUrl(url, property.type))
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    await prisma.$transaction(async (tx) => {
      await tx.propertyImage.deleteMany({ where: { propertyId: property.id } });
      await tx.propertyImage.createMany({
        data: normalizedImageUrls.map((url, index) => ({
          propertyId: property.id,
          url,
          isPrimary: index === 0,
        })),
      });
    });

    return res.json({
      data: {
        propertyId: property.id,
        imageUrls: normalizedImageUrls,
        thumbnailUrl: normalizedImageUrls[0],
      },
    });
  },

  async updatePropertyDetails(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Property id is required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const updates: Record<string, unknown> = {};
    if ("description" in body) {
      updates.description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
    }
    if ("notes" in body) {
      updates.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    }
    if ("faqs" in body) {
      updates.faqs = parseFaqs(body.faqs);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_DETAILS",
          message: "No detail fields provided",
        },
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: property.id },
      data: updates,
      select: {
        id: true,
        description: true,
        notes: true,
        faqs: true,
      },
    });

    return res.json({ data: updatedProperty });
  },

  async createPropertyChangeRequest(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (typeof id !== "string" || !id || !reason) {
      return res.status(400).json({
        error: {
          code: "INVALID_CHANGE_REQUEST",
          message: "Property id and reason are required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: {
        id: true,
        title: true,
        addressLine1: true,
        city: true,
        country: true,
        pricePerNight: true,
        hostId: true,
      },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const currentValues = {
      title: property.title,
      location: [property.addressLine1, property.city, property.country].filter(Boolean).join(", "),
      pricePerNight: property.pricePerNight.toNumber(),
    };
    const requestedValues = {
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : currentValues.title,
      location: typeof body.location === "string" && body.location.trim() ? body.location.trim() : currentValues.location,
      pricePerNight: Number.isFinite(Number(body.pricePerNight)) && Number(body.pricePerNight) > 0
        ? Math.round(Number(body.pricePerNight))
        : currentValues.pricePerNight,
    };
    const changed = Object.entries(requestedValues).some(
      ([key, value]) => currentValues[key as keyof typeof currentValues] !== value
    );

    if (!changed) {
      return res.status(400).json({
        error: {
          code: "NO_SENSITIVE_CHANGES",
          message: "No sensitive fields changed",
        },
      });
    }

    const requestId = randomUUID();
    const documents = Array.isArray(body.documents)
      ? body.documents.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const province = await prisma.province.findUnique({
      where: { name: property.city },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "PropertyChangeRequest"
          ("id", "propertyId", "hostId", "provinceId", "status", "currentValues", "requestedValues", "reason", "documents", "createdAt", "updatedAt")
        VALUES
          (${requestId}, ${property.id}, ${property.hostId}, ${province?.id ?? null}, 'PENDING', ${JSON.stringify(currentValues)}::jsonb, ${JSON.stringify(requestedValues)}::jsonb, ${reason}, ${JSON.stringify(documents)}::jsonb, NOW(), NOW())
      `;

      const assignments = province
        ? await tx.operatorProvinceAssignment.findMany({
            where: { provinceId: province.id, operator: { isActive: true } },
            select: { operatorId: true },
          })
        : [];

      if (assignments.length) {
        await tx.notification.createMany({
          data: assignments.map((assignment) => ({
            userId: assignment.operatorId,
            type: "SYSTEM",
            title: "Yêu cầu duyệt thay đổi chỗ nghỉ",
            message: `${property.title} vừa gửi thay đổi tên, vị trí hoặc mức giá gốc.`,
            metadata: {
              action: "PROPERTY_CHANGE_REQUESTED",
              propertyId: property.id,
              requestId,
            },
          })),
        });
      }
    });

    return res.status(201).json({
      data: {
        id: requestId,
        status: "PENDING",
      },
    });
  },

  async updatePropertyOperationalSettings(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        error: {
          code: "INVALID_PROPERTY_ID",
          message: "Property id is required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const amenityNames = parseStringList(body.amenities, []);
    const languageNames = parseStringList(body.languages, ["Tiếng Việt"]);
    const services = typeof body.services === "object" && body.services !== null ? body.services as Record<string, unknown> : {};
    const rules = typeof body.rules === "object" && body.rules !== null ? body.rules as Record<string, unknown> : {};

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: {
        ...(amenityNames.length
          ? {
              amenities: {
                set: [],
                connectOrCreate: amenityNames.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
            }
          : { amenities: { set: [] } }),
        breakfastIncluded: services.breakfastIncluded === true,
        parkingType: parseParkingType(services.parkingType),
        smokingAllowed: rules.smokingAllowed === true,
        partiesAllowed: rules.partiesAllowed === true,
        petsPolicy: parsePetPolicy(rules.petsPolicy),
        checkInFrom: parseTime(rules.checkInFrom, "15:00"),
        checkInTo: parseTime(rules.checkInTo, "18:00"),
        checkOutFrom: parseTime(rules.checkOutFrom, "08:00"),
        checkOutTo: parseTime(rules.checkOutTo, "11:00"),
        languages: {
          deleteMany: {},
          create: languageNames.map((language) => ({ language })),
        },
      },
      include: {
        amenities: { select: { id: true, name: true, icon: true }, orderBy: { name: "asc" } },
        languages: true,
      },
    });

    return res.json({
      data: {
        propertyId: updated.id,
        amenities: updated.amenities,
        services: {
          breakfastIncluded: updated.breakfastIncluded,
          parkingType: updated.parkingType,
        },
        rules: {
          smokingAllowed: updated.smokingAllowed,
          partiesAllowed: updated.partiesAllowed,
          petsPolicy: updated.petsPolicy,
          checkInFrom: updated.checkInFrom,
          checkInTo: updated.checkInTo,
          checkOutFrom: updated.checkOutFrom,
          checkOutTo: updated.checkOutTo,
        },
        languages: updated.languages.map((item) => item.language),
      },
    });
  },

  async listPropertyDailyRates(req: Request, res: Response) {
    const { id } = req.params;
    const from = parseDateOnly(req.query.from);
    const to = parseDateOnly(req.query.to);

    if (typeof id !== "string" || !id || !from || !to || to <= from) {
      return res.status(400).json({
        error: {
          code: "INVALID_DAILY_RATE_QUERY",
          message: "Property id, from and to are required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true, pricePerNight: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const rates = await prisma.$queryRaw<Array<{ date: Date; pricePerNight: string }>>`
      SELECT "date", "pricePerNight"
      FROM "PropertyDailyRate"
      WHERE "propertyId" = ${property.id}
        AND "date" >= ${from}
        AND "date" < ${to}
      ORDER BY "date" ASC
    `;

    return res.json({
      data: {
        propertyId: property.id,
        basePrice: property.pricePerNight.toNumber(),
        rates: rates.map((rate) => ({
          date: rate.date.toISOString().slice(0, 10),
          pricePerNight: Number(rate.pricePerNight),
        })),
      },
    });
  },

  async updatePropertyDailyRates(req: Request, res: Response) {
    const { id } = req.params;
    const rates: unknown[] = Array.isArray(req.body?.rates) ? req.body.rates : [];

    if (typeof id !== "string" || !id || !rates.length) {
      return res.status(400).json({
        error: {
          code: "INVALID_DAILY_RATE_PAYLOAD",
          message: "Property id and rates are required",
        },
      });
    }

    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(req.user!.role === "ADMIN" ? {} : { hostId: req.user!.id }),
      },
      select: { id: true, pricePerNight: true },
    });

    if (!property) {
      return res.status(404).json({
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "Property not found",
        },
      });
    }

    const basePrice = property.pricePerNight.toNumber();
    const minPrice = Math.round(basePrice * 0.7);
    const maxPrice = Math.round(basePrice * 1.3);
    const parsedRates = rates
      .map((rate: unknown) => {
        const item = typeof rate === "object" && rate !== null ? rate as Record<string, unknown> : {};
        const date = parseDateOnly(item.date);
        const pricePerNight = Number(item.pricePerNight);
        if (!date || !Number.isFinite(pricePerNight)) return null;
        return {
          date,
          pricePerNight: Math.round(pricePerNight),
        };
      })
      .filter((rate): rate is { date: Date; pricePerNight: number } => Boolean(rate));

    if (!parsedRates.length || parsedRates.some((rate) => rate.pricePerNight < minPrice || rate.pricePerNight > maxPrice)) {
      return res.status(400).json({
        error: {
          code: "DAILY_RATE_OUT_OF_RANGE",
          message: "Daily rates must stay within 30% of the base price",
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const rate of parsedRates) {
        if (rate.pricePerNight === basePrice) {
          await tx.$executeRaw`
            DELETE FROM "PropertyDailyRate"
            WHERE "propertyId" = ${property.id}
              AND "date" = ${rate.date}
          `;
        } else {
          await tx.$executeRaw`
            INSERT INTO "PropertyDailyRate" ("id", "propertyId", "date", "pricePerNight", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${property.id}, ${rate.date}, ${rate.pricePerNight}, NOW(), NOW())
            ON CONFLICT ("propertyId", "date")
            DO UPDATE SET "pricePerNight" = EXCLUDED."pricePerNight", "updatedAt" = NOW()
          `;
        }
      }
    });

    return res.json({
      data: {
        propertyId: property.id,
        basePrice,
        rates: parsedRates.map((rate) => ({
          date: rate.date.toISOString().slice(0, 10),
          pricePerNight: rate.pricePerNight,
        })),
      },
    });
  },

  async listProperties(req: Request, res: Response) {
    const properties = await prisma.property.findMany({
      where: { hostId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
          select: { id: true, url: true, isPrimary: true },
        },
        amenities: {
          select: { id: true, name: true, icon: true },
          orderBy: { name: "asc" },
        },
        languages: true,
        bookings: {
          select: { id: true, status: true, checkIn: true, checkOut: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return res.json({
      data: properties.map((property) => {
        const upcomingWindowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const now = new Date();
        const arrivals = property.bookings.filter((booking) =>
          booking.checkIn && booking.checkIn >= now && booking.checkIn <= upcomingWindowEnd
        ).length;
        const departures = property.bookings.filter((booking) =>
          booking.checkOut && booking.checkOut >= now && booking.checkOut <= upcomingWindowEnd
        ).length;

        return {
          id: property.id,
          code: `PR-${property.id.slice(-6).toUpperCase()}`,
          title: property.title,
          description: property.description,
          notes: property.notes,
          faqs: property.faqs,
          address: [property.addressLine1, property.city, property.country].filter(Boolean).join(", "),
          city: property.city,
          country: property.country,
          status: property.status,
          type: property.type,
          pricePerNight: property.pricePerNight.toNumber(),
          cleaningFee: property.cleaningFee?.toNumber() ?? null,
          maxGuests: property.maxGuests,
          bedroomCount: property.bedroomCount,
          bathrooms: property.bathrooms,
          livingRoomSofaBeds: property.livingRoomSofaBeds,
          childrenAllowed: property.childrenAllowed,
          cribsAvailable: property.cribsAvailable,
          sizeM2: property.sizeM2,
          breakfastIncluded: property.breakfastIncluded,
          parkingType: property.parkingType,
          smokingAllowed: property.smokingAllowed,
          partiesAllowed: property.partiesAllowed,
          petsPolicy: property.petsPolicy,
          checkInFrom: property.checkInFrom,
          checkInTo: property.checkInTo,
          checkOutFrom: property.checkOutFrom,
          checkOutTo: property.checkOutTo,
          languages: property.languages.map((item) => item.language),
          amenities: property.amenities,
          thumbnailUrl: normalizePropertyImageUrl(property.images[0]?.url, property.type),
          images: property.images
            .map((image) => ({
              id: image.id,
              url: normalizePropertyImageUrl(image.url, property.type),
              isPrimary: image.isPrimary,
            }))
            .filter((image): image is { id: string; url: string; isPrimary: boolean } => Boolean(image.url)),
          bookings: property._count.bookings,
          arrivals,
          departures,
          reviews: 0,
          cancellations: property.bookings.filter((booking) => booking.status === "CANCELLED").length,
          revenue: 0,
          occupancy: 0,
          createdAt: property.createdAt.toISOString(),
        };
      }),
    });
  },

  async listBookings(req: Request, res: Response) {
    const bookings = await bookingService.listHostBookings(req.user!.id);
    return res.json({ data: bookings });
  },

  async confirmBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CONFIRMED");
  },

  async cancelBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CANCELLED");
  },
};

async function handleUpdateStatus(
  req: Request,
  res: Response,
  status: "CONFIRMED" | "CANCELLED"
) {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      error: {
        code: "INVALID_BOOKING_ID",
        message: "Booking id is required",
      },
    });
  }

  const result = await bookingService.updateHostPropertyBookingStatus({
    hostId: req.user!.id,
    bookingId: id,
    status,
  });

  if (result.kind === "BOOKING_NOT_FOUND") {
    return res.status(404).json({
      error: {
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
      },
    });
  }

  if (result.kind === "BOOKING_NOT_PENDING") {
    return res.status(409).json({
      error: {
        code: "BOOKING_NOT_PENDING",
        message: "Only pending bookings can be updated",
      },
    });
  }

  return res.json({ data: result.data });
}
