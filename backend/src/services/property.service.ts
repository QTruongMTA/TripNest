import {
  BookingStatus,
  CancellationPolicy,
  ListingStatus,
  PropertyType,
} from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";
import { hasPropertyGuestCapacity } from "./availability.service";

type PropertyFaq = {
  id: string;
  question: string;
  answer: string;
};

type PublicPropertyListRow = Prisma.PropertyGetPayload<{
  include: {
    images: true;
    bookings: {
      select: {
        checkIn: true;
        checkOut: true;
        numGuests: true;
        review: { select: { rating: true } };
      };
    };
    amenities: { select: { name: true } };
  };
}>;

export type PublicPropertyQuery = {
  page: number;
  limit: number;
  city?: string;
  cities?: string[];
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  cancellationPolicy?: CancellationPolicy;
  checkIn?: Date;
  checkOut?: Date;
};

function toNumber(value: { toNumber(): number } | null) {
  return value ? value.toNumber() : null;
}

function buildRating(
  bookings: Array<{ review: {
    rating: number;
    cleanlinessRating?: number;
    comfortRating?: number;
    locationRating?: number;
    amenitiesRating?: number;
    valueRating?: number;
  } | null }>
) {
  const ratings = bookings
    .map((booking) => booking.review?.rating)
    .filter((rating): rating is number => rating !== undefined);

  if (ratings.length === 0) {
    return {
      average: null,
      count: 0,
      criteria: { cleanliness: 0, comfort: 0, location: 0, amenities: 0, value: 0 },
    };
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  const average = (selector: (review: NonNullable<(typeof bookings)[number]["review"]>) => number | undefined) => {
    const values = bookings
      .map((booking) => booking.review ? selector(booking.review) : undefined)
      .filter((value): value is number => typeof value === "number");
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;
  };
  return {
    average: Number((total / ratings.length).toFixed(1)),
    count: ratings.length,
    criteria: {
      cleanliness: average((review) => review.cleanlinessRating),
      comfort: average((review) => review.comfortRating),
      location: average((review) => review.locationRating),
      amenities: average((review) => review.amenitiesRating),
      value: average((review) => review.valueRating),
    },
  };
}

function parseReviewImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeFaqs(value: unknown): PropertyFaq[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const faq = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
      return {
        id: typeof faq.id === "string" && faq.id.trim() ? faq.id.trim() : `faq-${index + 1}`,
        question: typeof faq.question === "string" ? faq.question.trim() : "",
        answer: typeof faq.answer === "string" ? faq.answer.trim() : "",
      };
    })
    .filter((faq) => faq.question || faq.answer);
}

type ProvinceTravelHighlightRow = {
  provinceName: string;
  regionName: string;
  description: string;
};

const AREA_PRICE_TOLERANCE = 100_000;

function normalizeProvinceName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tp\.?|thanh pho|tinh)\s+/i, "")
    .replace(/[.\s]+/g, " ")
    .trim()
    .toLowerCase();
}

async function getProvinceTravelHighlight(city: string) {
  const highlights = await prisma.$queryRaw<ProvinceTravelHighlightRow[]>`
    SELECT
      "provinceName",
      "regionName",
      "description"
    FROM "ProvinceTravelHighlight"
  `;
  const normalizedCity = normalizeProvinceName(city);
  const highlight = highlights.find(
    (item) => normalizeProvinceName(item.provinceName) === normalizedCity
  );

  return highlight ?? null;
}

async function getAreaPriceInsight(
  propertyId: string,
  city: string,
  pricePerNight: number
) {
  const stats = await prisma.property.aggregate({
    where: {
      id: { not: propertyId },
      status: ListingStatus.ACTIVE,
      city: { equals: city, mode: "insensitive" },
      pricePerNight: { gt: 0 },
    },
    _avg: {
      pricePerNight: true,
    },
    _count: {
      _all: true,
    },
  });

  const averagePrice = toNumber(stats._avg.pricePerNight);
  const comparedPropertyCount = stats._count._all;

  if (!averagePrice || comparedPropertyCount === 0) {
    return {
      level: "UNKNOWN" as const,
      label: "Chưa đủ dữ liệu giá trong khu vực",
      averagePrice: null,
      difference: null,
      comparedPropertyCount,
    };
  }

  const roundedAveragePrice = Math.round(averagePrice);
  const difference = Math.round(pricePerNight - roundedAveragePrice);

  if (difference < -AREA_PRICE_TOLERANCE) {
    return {
      level: "DEAL" as const,
      label: "Giá cả ưu đãi trong khu vực",
      averagePrice: roundedAveragePrice,
      difference,
      comparedPropertyCount,
    };
  }

  if (Math.abs(difference) <= AREA_PRICE_TOLERANCE) {
    return {
      level: "MID_RANGE" as const,
      label: "Giá cả tầm trung trong khu vực",
      averagePrice: roundedAveragePrice,
      difference,
      comparedPropertyCount,
    };
  }

  return {
    level: "PREMIUM" as const,
    label: "Giá cả cao cấp trong khu vực",
    averagePrice: roundedAveragePrice,
    difference,
    comparedPropertyCount,
  };
}

export const propertyService = {
  async listPublicProperties(query: PublicPropertyQuery) {
    const hasDateCapacityFilter = Boolean(query.checkIn && query.checkOut && query.guests);
    const where = {
      status: ListingStatus.ACTIVE,
      ...(query.city
        ? { city: { contains: query.city, mode: "insensitive" as const } }
        : {}),
      ...(query.cities?.length
        ? {
            OR: query.cities.map((city) => ({
              city: { contains: city, mode: "insensitive" as const },
            })),
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.guests ? { maxGuests: { gte: query.guests } } : {}),
      ...(query.bedrooms ? { bedroomCount: { gte: query.bedrooms } } : {}),
      ...(query.bathrooms ? { bathrooms: { gte: query.bathrooms } } : {}),
      ...(query.cancellationPolicy
        ? { cancellationPolicy: query.cancellationPolicy }
        : {}),
      ...(query.amenities?.length
        ? {
            amenities: {
              some: {
                name: { in: query.amenities },
              },
            },
          }
        : {}),
      ...(query.checkIn && query.checkOut
        ? {
            NOT: [
              {
                availability: {
                  some: {
                    date: {
                      gte: query.checkIn,
                      lt: query.checkOut,
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            pricePerNight: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
    };

    const bookingWhere = hasDateCapacityFilter && query.checkIn && query.checkOut
      ? {
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          checkIn: { lt: query.checkOut },
          checkOut: { gt: query.checkIn },
        }
      : { review: { isNot: null } };

    const findManyArgs: Prisma.PropertyFindManyArgs = {
      where,
      ...(hasDateCapacityFilter ? {} : { skip: (query.page - 1) * query.limit, take: query.limit }),
      orderBy: { createdAt: "desc" },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        bookings: {
          where: bookingWhere,
          select: {
            checkIn: true,
            checkOut: true,
            numGuests: true,
            review: {
              select: {
                rating: true,
                cleanlinessRating: true,
                comfortRating: true,
                locationRating: true,
                amenitiesRating: true,
                valueRating: true,
              },
            },
          },
        },
        amenities: {
          select: { name: true },
        },
      },
    };

    const [baseTotal, properties] = await prisma.$transaction([
      prisma.property.count({ where }),
      prisma.property.findMany(findManyArgs),
    ]);
    const propertyRows = properties as PublicPropertyListRow[];

    const capacityFilteredProperties = hasDateCapacityFilter && query.checkIn && query.checkOut && query.guests
      ? propertyRows.filter((property) =>
          hasPropertyGuestCapacity({
            maxGuests: property.maxGuests,
            requestedGuests: query.guests!,
            checkIn: query.checkIn!,
            checkOut: query.checkOut!,
            bookings: property.bookings.map((booking) => ({
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              numGuests: booking.numGuests,
            })),
          })
        )
      : propertyRows;
    const total = hasDateCapacityFilter ? capacityFilteredProperties.length : baseTotal;
    const pageItems = hasDateCapacityFilter
      ? capacityFilteredProperties.slice((query.page - 1) * query.limit, query.page * query.limit)
      : capacityFilteredProperties;

    return {
      data: pageItems.map((property) => ({
        id: property.id,
        title: property.title,
        city: property.city,
        country: property.country,
        type: property.type,
        pricePerNight: property.pricePerNight.toNumber(),
        cleaningFee: toNumber(property.cleaningFee),
        maxGuests: property.maxGuests,
        bedroomCount: property.bedroomCount,
        bathrooms: property.bathrooms,
        amenityNames: property.amenities.map((amenity) => amenity.name),
        thumbnailUrl: normalizePropertyImageUrl(property.images[0]?.url, property.type),
        rating: buildRating(property.bookings),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getPublicPropertyById(id: string) {
    const property = await prisma.property.findFirst({
      where: {
        id,
        status: ListingStatus.ACTIVE,
      },
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        },
        amenities: {
          orderBy: { name: "asc" },
        },
        languages: true,
        bedrooms: {
          orderBy: { roomNumber: "asc" },
        },
        childPricing: true,
        ratePlans: true,
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        availability: {
          orderBy: { date: "asc" },
          select: {
            date: true,
            status: true,
          },
        },
        bookings: {
          where: { review: { isNot: null } },
          select: {
            review: {
              select: {
                id: true,
                rating: true,
                cleanlinessRating: true,
                comfortRating: true,
                locationRating: true,
                amenitiesRating: true,
                valueRating: true,
                comment: true,
                images: true,
                revisionCount: true,
                createdAt: true,
                lastEditedAt: true,
                user: { select: { displayName: true, name: true, email: true, avatar: true } },
              },
            },
            checkIn: true,
            checkOut: true,
          },
        },
      },
    });

    if (!property) return null;
    const pricePerNight = property.pricePerNight.toNumber();
    const [provinceHighlight, priceInsight] = await Promise.all([
      getProvinceTravelHighlight(property.city),
      getAreaPriceInsight(property.id, property.city, pricePerNight),
    ]);

    return {
      id: property.id,
      title: property.title,
      city: property.city,
      country: property.country,
      type: property.type,
      pricePerNight,
      cleaningFee: toNumber(property.cleaningFee),
      maxGuests: property.maxGuests,
      bedroomCount: property.bedroomCount,
      bathrooms: property.bathrooms,
      livingRoomSofaBeds: property.livingRoomSofaBeds,
      childrenAllowed: property.childrenAllowed,
      cribsAvailable: property.cribsAvailable,
      sizeM2: property.sizeM2,
      thumbnailUrl: normalizePropertyImageUrl(
        property.images.find((image) => image.isPrimary)?.url,
        property.type
      ),
      rating: buildRating(property.bookings),
      reviews: property.bookings
        .filter((booking) => booking.review)
        .map((booking) => ({
          id: booking.review!.id,
          rating: booking.review!.rating,
          criteria: {
            cleanliness: booking.review!.cleanlinessRating,
            comfort: booking.review!.comfortRating,
            location: booking.review!.locationRating,
            amenities: booking.review!.amenitiesRating,
            value: booking.review!.valueRating,
          },
          comment: booking.review!.comment,
          images: parseReviewImages(booking.review!.images),
          revisionCount: booking.review!.revisionCount,
          createdAt: booking.review!.createdAt.toISOString(),
          lastEditedAt: booking.review!.lastEditedAt?.toISOString() ?? null,
          guest: {
            name: booking.review!.user.displayName ?? booking.review!.user.name ?? booking.review!.user.email,
            avatar: booking.review!.user.avatar,
          },
          stay: {
            checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
            checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
          },
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      description: property.description,
      notes: property.notes,
      faqs: normalizeFaqs(property.faqs),
      address: {
        line1: property.addressLine1,
        line2: property.addressLine2,
        city: property.city,
        postalCode: property.postalCode,
        country: property.country,
      },
      provinceHighlight,
      priceInsight,
      location: {
        latitude: property.latitude,
        longitude: property.longitude,
      },
      capacity: {
        maxGuests: property.maxGuests,
        bedroomCount: property.bedroomCount,
        bathrooms: property.bathrooms,
      },
      bedrooms: property.bedrooms.map((br) => ({
        roomNumber: br.roomNumber,
        singleBeds: br.singleBeds,
        doubleBeds: br.doubleBeds,
        kingBeds: br.kingBeds,
        superKingBeds: br.superKingBeds,
        bunkBeds: br.bunkBeds,
        sofaBeds: br.sofaBeds,
        futonBeds: br.futonBeds,
      })),
      policies: {
        cancellationPolicy: property.cancellationPolicy,
        cancellationFreeDays: property.cancellationFreeDays,
        mistakeProtection: property.mistakeProtection,
        bookingMethod: property.bookingMethod,
        checkIn: { from: property.checkInFrom, to: property.checkInTo },
        checkOut: { from: property.checkOutFrom, to: property.checkOutTo },
        smokingAllowed: property.smokingAllowed,
        partiesAllowed: property.partiesAllowed,
        petsPolicy: property.petsPolicy,
      },
      services: {
        breakfastIncluded: property.breakfastIncluded,
        parkingType: property.parkingType,
      },
      languages: property.languages.map((l) => l.language),
      ratePlans: property.ratePlans.map((rp) => ({
        type: rp.type,
        enabled: rp.enabled,
        discountPct: rp.discountPct,
      })),
      childPricing: property.childPricing
        ? {
            enabled: property.childPricing.enabled,
            infantFree: property.childPricing.infantFree,
            infantPrice: toNumber(property.childPricing.infantPrice),
            childMaxAge: property.childPricing.childMaxAge,
            childFree: property.childPricing.childFree,
            childPrice: toNumber(property.childPricing.childPrice),
          }
        : null,
      images: property.images
        .map((image) => ({
          id: image.id,
          url: normalizePropertyImageUrl(image.url, property.type),
          isPrimary: image.isPrimary,
        }))
        .filter((image): image is { id: string; url: string; isPrimary: boolean } => Boolean(image.url)),
      amenities: property.amenities.map((amenity) => ({
        id: amenity.id,
        name: amenity.name,
        icon: amenity.icon,
      })),
      host: property.host,
      availability: {
        blockedDates: property.availability.map((slot) => ({
          date: slot.date.toISOString().slice(0, 10),
          status: slot.status,
        })),
        window: property.availabilityWindow,
        longStayAllowed: property.longStayAllowed,
        maxStayNights: property.maxStayNights,
      },
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  },
};
