import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { bookingService } from "../services/booking.service";
import { reviewService } from "../services/review.service";
import { prisma } from "../lib/prisma";
import {
  AvailabilityStatus,
  BookingMethod,
  ParkingType,
  PetPolicy,
  PropertyType,
  RatePlanType,
} from "../generated/prisma/enums";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

type LegalOwnerInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  sortOrder?: number;
};

type PropertyImageInput = {
  url: string;
  isPrimary?: boolean;
};

type BedroomInput = {
  roomNumber?: number;
  singleBeds?: number;
  doubleBeds?: number;
  kingBeds?: number;
  superKingBeds?: number;
  bunkBeds?: number;
  sofaBeds?: number;
  futonBeds?: number;
};

type RatePlanInput = {
  type?: RatePlanType;
  enabled?: boolean;
  discountPct?: number;
};

type HostProfileUpdateInput = {
  displayName?: string;
  phone?: string;
  address?: string;
  nationality?: string;
  notes?: string;
};

type PropertyLegalSnapshot = {
  id: string;
  title: string;
  city: string;
  status: string;
  legalEntityType: string | null;
  ownerAlias: string | null;
  owners: Array<{
    firstName: string;
    lastName: string;
    birthDate: string;
  }>;
};

export const hostController = {
  async getProfileRequest(req: Request, res: Response) {
    const [user, latestRequest, latestProperty] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          phone: true,
          address: true,
          nationality: true,
          gender: true,
          birthDate: true,
          avatar: true,
        },
      }),
      prisma.hostApprovalRequest.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          provinceId: true,
          reviewedBy: true,
          reviewedAt: true,
          notes: true,
          documents: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.property.findFirst({
        where: { hostId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          city: true,
          status: true,
          legalEntityType: true,
          ownerAlias: true,
          owners: {
            orderBy: { sortOrder: "asc" },
            select: {
              firstName: true,
              lastName: true,
              birthDate: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({
      data: {
        user: {
          ...user,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
        },
        latestRequest,
        latestProperty: latestProperty
          ? {
              ...latestProperty,
              owners: latestProperty.owners.map((owner) => ({
                ...owner,
                birthDate: owner.birthDate.toISOString(),
              })),
            } satisfies PropertyLegalSnapshot
          : null,
      },
    });
  },

  async submitProfileRequest(req: Request, res: Response) {
    const body = req.body ?? {};
    const payload: HostProfileUpdateInput = {};

    if (typeof body.displayName === "string" && body.displayName.trim()) payload.displayName = body.displayName.trim();
    if (typeof body.phone === "string" && body.phone.trim()) payload.phone = body.phone.trim();
    if (typeof body.address === "string" && body.address.trim()) payload.address = body.address.trim();
    if (typeof body.nationality === "string" && body.nationality.trim()) payload.nationality = body.nationality.trim();
    if (typeof body.notes === "string" && body.notes.trim()) payload.notes = body.notes.trim();

    const documents = body.documents && typeof body.documents === "object" ? body.documents : null;

    const result = await prisma.$transaction(async (tx) => {
      const latestProperty = await tx.property.findFirst({
        where: { hostId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          city: true,
          status: true,
          legalEntityType: true,
          ownerAlias: true,
          owners: {
            orderBy: { sortOrder: "asc" },
            select: {
              firstName: true,
              lastName: true,
              birthDate: true,
            },
          },
        },
      });

      if (!latestProperty) {
        return { kind: "NO_PROPERTY" as const };
      }

      const currentUser = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(payload.displayName ? { displayName: payload.displayName } : {}),
          ...(payload.phone ? { phone: payload.phone } : {}),
          ...(payload.address ? { address: payload.address } : {}),
          ...(payload.nationality ? { nationality: payload.nationality } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          phone: true,
          address: true,
          nationality: true,
          gender: true,
          birthDate: true,
          avatar: true,
        },
      });

      const latestRequest = await tx.hostApprovalRequest.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });

      const approvalRequestData = {
        userId: req.user!.id,
        status: "PENDING" as const,
        provinceId: null,
        reviewedBy: null,
        reviewedAt: null,
        notes: payload.notes ?? null,
        documents: {
          ...((documents && typeof documents === "object") ? documents : {}),
          profile: {
            displayName: currentUser.displayName ?? currentUser.name ?? currentUser.email,
            phone: currentUser.phone,
            address: currentUser.address,
            nationality: currentUser.nationality,
          },
          latestProperty: {
            id: latestProperty.id,
            title: latestProperty.title,
            city: latestProperty.city,
            status: latestProperty.status,
            legalEntityType: latestProperty.legalEntityType,
            ownerAlias: latestProperty.ownerAlias,
            owners: latestProperty.owners.map((owner) => ({
              firstName: owner.firstName,
              lastName: owner.lastName,
              birthDate: owner.birthDate.toISOString(),
            })),
          },
        },
      };

      const request = latestRequest && (latestRequest.status === "PENDING" || latestRequest.status === "UNDER_REVIEW")
        ? await tx.hostApprovalRequest.update({
            where: { id: latestRequest.id },
            data: approvalRequestData,
          })
        : await tx.hostApprovalRequest.create({
            data: approvalRequestData,
          });

      return { user: currentUser, request };
    });

    if ("kind" in result && result.kind === "NO_PROPERTY") {
      return res.status(400).json({
        error: {
          code: "HOST_PROPERTY_REQUIRED",
          message: "Vui lòng đăng cơ sở lưu trú trước khi bổ sung hồ sơ host.",
        },
      });
    }

    return res.status(201).json({ data: result });
  },

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

    const imageInputs = normalizeImageInputs(body.imageUrls, body.thumbnailUrl, body.type);
    const primaryImage = imageInputs.find((image) => image.isPrimary) ?? imageInputs[0];
    const legalVerification = body.legalVerification && typeof body.legalVerification === "object"
      ? body.legalVerification
      : null;
    const contactProfile = body.contactProfile && typeof body.contactProfile === "object"
      ? body.contactProfile as Record<string, unknown>
      : null;
    const contactDisplayName = typeof contactProfile?.displayName === "string" ? contactProfile.displayName.trim() : "";
    const contactPhone = typeof contactProfile?.phone === "string" ? contactProfile.phone.trim() : "";
    const contactAddress = typeof contactProfile?.address === "string" ? contactProfile.address.trim() : "";
    const contactNationality = typeof contactProfile?.nationality === "string" ? contactProfile.nationality.trim() : "";
    const ownerInputs: LegalOwnerInput[] = Array.isArray(legalVerification?.owners)
      ? legalVerification.owners.filter((owner: unknown): owner is LegalOwnerInput => {
          if (!owner || typeof owner !== "object") return false;
          const value = owner as Record<string, unknown>;
          return (
            typeof value.firstName === "string" &&
            typeof value.lastName === "string" &&
            typeof value.birthDate === "string" &&
            Boolean(value.firstName.trim()) &&
            Boolean(value.lastName.trim()) &&
            Boolean(value.birthDate.trim())
          );
        })
      : [];
    const amenities: string[] = Array.isArray(body.amenities)
      ? body.amenities.filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 40)
      : [];
    const languages: string[] = Array.isArray(body.languages)
      ? body.languages.filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 20)
      : [];
    const bedrooms = normalizeBedrooms(body.bedrooms);
    const ratePlans = normalizeRatePlans(body.ratePlans);
    const blockedDatesBeforeFirstBooking = buildPreOpeningBlocks(body.firstBookableDate);
    const childPricing = body.childPricing && typeof body.childPricing === "object"
      ? body.childPricing as Record<string, unknown>
      : null;
    const rules = body.rules && typeof body.rules === "object"
      ? body.rules as Record<string, unknown>
      : {};

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
          bedroomCount: bedrooms.length || (typeof body.bedroomCount === "number" ? body.bedroomCount : 0),
          bathrooms: body.bathrooms,
          livingRoomSofaBeds: toNonNegativeInt(body.livingRoomSofaBeds, 0),
          childrenAllowed: typeof body.childrenAllowed === "boolean" ? body.childrenAllowed : true,
          cribsAvailable: typeof body.cribsAvailable === "boolean" ? body.cribsAvailable : false,
          ...(typeof body.sizeM2 === "number" && body.sizeM2 > 0 ? { sizeM2: body.sizeM2 } : {}),
          type: body.type,
          bookingMethod: Object.values(BookingMethod).includes(body.bookingMethod) ? body.bookingMethod : "INSTANT",
          launchDiscountEnabled: body.launchDiscountEnabled === true,
          cancellationFreeDays: toNonNegativeInt(body.cancellationFreeDays, 1),
          mistakeProtection: body.mistakeProtection !== false,
          breakfastIncluded: body.breakfastIncluded === true,
          parkingType: Object.values(ParkingType).includes(body.parkingType) ? body.parkingType : "NOT_AVAILABLE",
          smokingAllowed: rules.smokingAllowed === true,
          partiesAllowed: rules.partiesAllowed === true,
          petsPolicy: Object.values(PetPolicy).includes(rules.petsPolicy as PetPolicy) ? rules.petsPolicy as PetPolicy : "NOT_ALLOWED",
          checkInFrom: typeof rules.checkInFrom === "string" ? rules.checkInFrom : null,
          checkInTo: typeof rules.checkInTo === "string" ? rules.checkInTo : null,
          checkOutFrom: typeof rules.checkOutFrom === "string" ? rules.checkOutFrom : null,
          checkOutTo: typeof rules.checkOutTo === "string" ? rules.checkOutTo : null,
          groupPricingEnabled: body.groupPricingEnabled === true,
          oneGuestDiscountPct: clampInt(body.oneGuestDiscountPct, 0, 99, 0),
          availabilityWindow: clampInt(body.availabilityWindow, 30, 540, 365),
          longStayAllowed: body.longStayAllowed === true,
          maxStayNights: body.longStayAllowed === true ? clampInt(body.maxStayNights, 30, 365, 30) : null,
          legalEntityType: body.legalEntityType === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL",
          ownerAlias: typeof body.ownerAlias === "string" && body.ownerAlias.trim() ? body.ownerAlias.trim() : null,
          hostId: req.user!.id,
          status: "PENDING",
          images: {
            create: imageInputs.length
              ? imageInputs.map((image) => ({
                  url: image.url,
                  isPrimary: image.url === primaryImage?.url,
                }))
              : [{ url: normalizePropertyImageUrl(null, body.type), isPrimary: true }],
          },
          ...(amenities.length
            ? {
                amenities: {
                  connectOrCreate: amenities.map((name) => ({
                    where: { name: name.trim() },
                    create: { name: name.trim() },
                  })),
                },
              }
            : {}),
          ...(languages.length
            ? {
                languages: {
                  create: languages.map((language) => ({ language: language.trim() })),
                },
              }
            : {}),
          ...(bedrooms.length ? { bedrooms: { create: bedrooms } } : {}),
          ...(ratePlans.length ? { ratePlans: { create: ratePlans } } : {}),
          ...(childPricing
            ? {
                childPricing: {
                  create: {
                    enabled: childPricing.enabled !== false,
                    infantFree: childPricing.infantFree !== false,
                    infantPrice: childPricing.infantFree === false ? toOptionalMoney(childPricing.infantPrice) : null,
                    childMaxAge: clampInt(childPricing.childMaxAge, 3, 17, 17),
                    childFree: childPricing.childFree !== false,
                    childPrice: childPricing.childFree === false ? toOptionalMoney(childPricing.childPrice) : null,
                  },
                },
              }
            : {}),
          ...(blockedDatesBeforeFirstBooking.length
            ? {
                availability: {
                  create: blockedDatesBeforeFirstBooking.map((date) => ({
                    date,
                    status: AvailabilityStatus.BLOCKED,
                    reason: "Chưa mở nhận khách theo ngày bắt đầu do host chọn",
                  })),
                },
              }
            : {}),
        },
      });

      if (ownerInputs.length > 0) {
        await tx.propertyOwner.createMany({
          data: ownerInputs.slice(0, 4).map((owner, index) => ({
            propertyId: created.id,
            firstName: owner.firstName.trim(),
            lastName: owner.lastName.trim(),
            birthDate: new Date(owner.birthDate),
            sortOrder: typeof owner.sortOrder === "number" ? owner.sortOrder : index,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "PROPERTY_APPROVAL_REQUESTED",
          entity: "Property",
          entityId: created.id,
          newValue: {
            title: created.title,
            city: created.city,
            status: created.status,
            listingSetup: {
              imageCount: imageInputs.length,
              amenityCount: amenities.length,
              languageCount: languages.length,
              bedroomCount: bedrooms.length,
              ratePlanCount: ratePlans.length,
              blockedPreOpeningDates: blockedDatesBeforeFirstBooking.length,
            },
            legalVerification,
          },
        },
      });

      const currentUser = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(contactDisplayName ? { displayName: contactDisplayName } : {}),
          ...(contactPhone ? { phone: contactPhone } : {}),
          ...(contactAddress ? { address: contactAddress } : {}),
          ...(contactNationality ? { nationality: contactNationality } : {}),
        },
        select: {
          email: true,
          name: true,
          displayName: true,
          phone: true,
          address: true,
          nationality: true,
        },
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

      const latestApprovalRequest = await tx.hostApprovalRequest.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });
      const approvalRequestData = {
        userId: req.user!.id,
        status: "PENDING" as const,
        provinceId: province?.id ?? null,
        reviewedBy: null,
        reviewedAt: null,
        notes: null,
        documents: {
          source: "property-registration",
          profile: {
            displayName: currentUser.displayName ?? currentUser.name ?? currentUser.email,
            phone: currentUser.phone,
            address: currentUser.address,
            nationality: currentUser.nationality,
          },
          latestProperty: {
            id: created.id,
            title: created.title,
            city: created.city,
            status: created.status,
            legalEntityType: created.legalEntityType,
            ownerAlias: created.ownerAlias,
            owners: ownerInputs.slice(0, 4).map((owner) => ({
              firstName: owner.firstName.trim(),
              lastName: owner.lastName.trim(),
              birthDate: new Date(owner.birthDate).toISOString(),
            })),
          },
        },
      };

      if (latestApprovalRequest && ["PENDING", "UNDER_REVIEW"].includes(latestApprovalRequest.status)) {
        await tx.hostApprovalRequest.update({
          where: { id: latestApprovalRequest.id },
          data: approvalRequestData,
        });
      } else {
        await tx.hostApprovalRequest.create({ data: approvalRequestData });
      }

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

  async listProperties(req: Request, res: Response) {
    const [properties, latestHostApproval, revisionLogs, fieldInspectionTasks] = await prisma.$transaction([
      prisma.property.findMany({
        where: { hostId: req.user!.id },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
          bookings: {
            select: { id: true, status: true, checkIn: true, checkOut: true },
          },
          settlements: {
            select: { hostAmount: true, status: true, recognizedAt: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      }),
      prisma.hostApprovalRequest.findFirst({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          reviewedAt: true,
          createdAt: true,
          notes: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "LISTING_REVISION_REQUESTED",
          entity: "Property",
          entityId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          entityId: true,
          createdAt: true,
          newValue: true,
        },
      }),
      prisma.operatorTask.findMany({
        where: {
          entityType: "Property",
          entityId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          entityId: true,
          status: true,
          reportResult: true,
          reportNotes: true,
          dueDate: true,
          createdAt: true,
        },
      }),
    ]);

    const latestRevisionByProperty = new Map<string, { createdAt: string; notes?: string; requestedItems: string[] }>();
    for (const log of revisionLogs) {
      if (!log.entityId || latestRevisionByProperty.has(log.entityId)) continue;
      const newValue = log.newValue && typeof log.newValue === "object" ? (log.newValue as Record<string, unknown>) : null;
      const requestedItemsRaw = newValue?.requestedItems;
      const latestRevision: { createdAt: string; notes?: string; requestedItems: string[] } = {
        createdAt: log.createdAt.toISOString(),
        requestedItems: Array.isArray(requestedItemsRaw)
          ? requestedItemsRaw.filter((item): item is string => typeof item === "string")
          : [],
      };
      if (typeof newValue?.notes === "string") {
        latestRevision.notes = newValue.notes;
      }
      latestRevisionByProperty.set(log.entityId, latestRevision);
    }

    const latestFieldInspectionByProperty = new Map<string, {
      status: string;
      reportResult?: string | null;
      reportNotes?: string | null;
      dueDate?: string | null;
      createdAt: string;
    }>();
    for (const task of fieldInspectionTasks) {
      if (!task.entityId || latestFieldInspectionByProperty.has(task.entityId)) continue;
      latestFieldInspectionByProperty.set(task.entityId, {
        status: task.status,
        reportResult: task.reportResult,
        reportNotes: task.reportNotes,
        dueDate: task.dueDate?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
      });
    }

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
        const revenue = property.settlements
          .filter((settlement) => settlement.status === "AVAILABLE" || settlement.status === "PAID")
          .reduce((sum, settlement) => sum + settlement.hostAmount.toNumber(), 0);
        const occupancy = property.bookings.length > 0
          ? Math.round((property.bookings.filter((booking) => booking.status === "COMPLETED").length / property.bookings.length) * 1000) / 10
          : 0;

        return {
          id: property.id,
          code: `PR-${property.id.slice(-6).toUpperCase()}`,
          title: property.title,
          address: [property.addressLine1, property.city, property.country].filter(Boolean).join(", "),
          city: property.city,
          country: property.country,
          status: property.status,
          type: property.type,
          pricePerNight: property.pricePerNight.toNumber(),
          maxGuests: property.maxGuests,
          bedroomCount: property.bedroomCount,
          bathrooms: property.bathrooms,
          thumbnailUrl: normalizePropertyImageUrl(property.images[0]?.url, property.type),
          bookings: property._count.bookings,
          arrivals,
          departures,
          reviews: 0,
          cancellations: property.bookings.filter((booking) => booking.status === "CANCELLED").length,
          revenue,
          occupancy,
          hostApprovalStatus: latestHostApproval?.status ?? null,
          hostApprovalReviewedAt: latestHostApproval?.reviewedAt?.toISOString() ?? latestHostApproval?.createdAt.toISOString() ?? null,
          hostApprovalNotes: latestHostApproval?.notes ?? null,
          latestRevisionRequest: latestRevisionByProperty.get(property.id) ?? null,
          latestFieldInspection: latestFieldInspectionByProperty.get(property.id) ?? null,
          createdAt: property.createdAt.toISOString(),
        };
      }),
    });
  },

  async listBookings(req: Request, res: Response) {
    const bookings = await bookingService.listHostBookings(req.user!.id);
    return res.json({ data: bookings });
  },

  async finance(req: Request, res: Response) {
    const data = await bookingService.getHostFinance(req.user!.id);
    return res.json({ data });
  },

  async reviews(req: Request, res: Response) {
    const data = await reviewService.listHostReviews(req.user!.id);
    return res.json({ data });
  },

  async confirmBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CONFIRMED");
  },

  async cancelBooking(req: Request, res: Response) {
    return handleUpdateStatus(req, res, "CANCELLED");
  },

  async checkInBooking(req: Request, res: Response) {
    const bookingId = typeof req.params.id === "string" && req.params.id ? req.params.id : null;
    if (!bookingId) {
      return res.status(400).json({
        error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" },
      });
    }

    const result = await bookingService.checkInHostBooking({
      hostId: req.user!.id,
      bookingId,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
      });
    }

    if (result.kind === "INVALID_BOOKING_STATUS") {
      return res.status(409).json({
        error: { code: "INVALID_BOOKING_STATUS", message: "Booking is not ready for check-in" },
      });
    }

    return res.json({ data: result.data });
  },

  async confirmPayment(req: Request, res: Response) {
    const bookingId = typeof req.params.id === "string" ? req.params.id : "";
    const method = req.body?.method;
    if (
      !bookingId ||
      (method !== "CASH" && method !== "BANK_TRANSFER")
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_PAYMENT_CONFIRMATION",
          message: "Vui lòng chọn tiền mặt hoặc chuyển khoản.",
        },
      });
    }

    const result = await bookingService.confirmHostPayment({
      hostId: req.user!.id,
      bookingId,
      method,
      transactionId: req.body?.transactionId,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
      });
    }
    if (result.kind === "BOOKING_NOT_PAYABLE") {
      return res.status(409).json({
        error: {
          code: "BOOKING_NOT_PAYABLE",
          message: "Booking chưa ở trạng thái có thể thu tiền.",
        },
      });
    }
    if (result.kind === "PAYMENT_ALREADY_RECORDED") {
      return res.status(409).json({
        error: {
          code: "PAYMENT_ALREADY_RECORDED",
          message: "Booking đã được thanh toán trước đó.",
        },
      });
    }

    return res.json({ data: result.data });
  },

  async checkOutBooking(req: Request, res: Response) {
    const bookingId = typeof req.params.id === "string" && req.params.id ? req.params.id : null;
    if (!bookingId) {
      return res.status(400).json({
        error: { code: "INVALID_BOOKING_ID", message: "Booking id is required" },
      });
    }

    const result = await bookingService.checkOutHostBooking({
      hostId: req.user!.id,
      bookingId,
    });

    if (result.kind === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
      });
    }

    if (result.kind === "INVALID_BOOKING_STATUS") {
      return res.status(409).json({
        error: { code: "INVALID_BOOKING_STATUS", message: "Booking is not ready for checkout" },
      });
    }

    if (result.kind === "PAYMENT_REQUIRED") {
      return res.status(409).json({
        error: { code: "PAYMENT_REQUIRED", message: "Payment must be completed before checkout" },
      });
    }

    return res.json({ data: result.data });
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

function normalizeImageInputs(rawImages: unknown, thumbnailUrl: unknown, propertyType: PropertyType): PropertyImageInput[] {
  const imageInputs = Array.isArray(rawImages)
    ? rawImages
        .map((item): PropertyImageInput | null => {
          if (typeof item === "string") {
            return { url: normalizePropertyImageUrl(item, propertyType) };
          }
          if (!item || typeof item !== "object") return null;
          const value = item as Record<string, unknown>;
          if (typeof value.url !== "string") return null;
          return {
            url: normalizePropertyImageUrl(value.url, propertyType),
            isPrimary: value.isPrimary === true,
          };
        })
        .filter((item): item is PropertyImageInput => Boolean(item))
    : [];

  if (imageInputs.length === 0 && typeof thumbnailUrl === "string") {
    imageInputs.push({ url: normalizePropertyImageUrl(thumbnailUrl, propertyType), isPrimary: true });
  }

  const deduped = Array.from(new Map(imageInputs.map((image) => [image.url, image])).values()).slice(0, 30);
  const firstImage = deduped[0];
  if (firstImage && !deduped.some((image) => image.isPrimary)) {
    firstImage.isPrimary = true;
  }

  return deduped;
}

function normalizeBedrooms(rawBedrooms: unknown) {
  if (!Array.isArray(rawBedrooms)) return [];

  return rawBedrooms
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const bedroom = item as BedroomInput;
      return {
        roomNumber: clampInt(bedroom.roomNumber, 1, 50, index + 1),
        singleBeds: toNonNegativeInt(bedroom.singleBeds, 0),
        doubleBeds: toNonNegativeInt(bedroom.doubleBeds, 0),
        kingBeds: toNonNegativeInt(bedroom.kingBeds, 0),
        superKingBeds: toNonNegativeInt(bedroom.superKingBeds, 0),
        bunkBeds: toNonNegativeInt(bedroom.bunkBeds, 0),
        sofaBeds: toNonNegativeInt(bedroom.sofaBeds, 0),
        futonBeds: toNonNegativeInt(bedroom.futonBeds, 0),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((bedroom) => (
      bedroom.singleBeds +
      bedroom.doubleBeds +
      bedroom.kingBeds +
      bedroom.superKingBeds +
      bedroom.bunkBeds +
      bedroom.sofaBeds +
      bedroom.futonBeds
    ) > 0)
    .slice(0, 50)
    .map((bedroom, index) => ({ ...bedroom, roomNumber: index + 1 }));
}

function normalizeRatePlans(rawRatePlans: unknown) {
  if (!Array.isArray(rawRatePlans)) return [];

  const byType = new Map<RatePlanType, { type: RatePlanType; enabled: boolean; discountPct: number }>();
  for (const item of rawRatePlans) {
    if (!item || typeof item !== "object") continue;
    const ratePlan = item as RatePlanInput;
    if (!ratePlan.type || !Object.values(RatePlanType).includes(ratePlan.type)) continue;
    byType.set(ratePlan.type, {
      type: ratePlan.type,
      enabled: ratePlan.enabled !== false,
      discountPct: clampInt(ratePlan.discountPct, 0, 99, ratePlan.type === "WEEKLY" ? 15 : 10),
    });
  }

  return Array.from(byType.values());
}

function buildPreOpeningBlocks(firstBookableDate: unknown) {
  if (typeof firstBookableDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(firstBookableDate)) {
    return [];
  }

  const parts = firstBookableDate.split("-").map(Number);
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return [];
  const firstDate = new Date(Date.UTC(year, month - 1, day));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  const dates: Date[] = [];
  while (cursor < firstDate && dates.length < 540) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function toNonNegativeInt(value: unknown, fallback: number) {
  return clampInt(value, 0, 999, fallback);
}

function toOptionalMoney(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}
