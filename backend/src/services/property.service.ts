import {
  BookingStatus,
  CancellationPolicy,
  ListingStatus,
  PropertyType,
} from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

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
  bookings: Array<{ review: { rating: number } | null }>
) {
  const ratings = bookings
    .map((booking) => booking.review?.rating)
    .filter((rating): rating is number => rating !== undefined);

  if (ratings.length === 0) {
    return { average: null, count: 0 };
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return {
    average: Number((total / ratings.length).toFixed(1)),
    count: ratings.length,
  };
}

export const propertyService = {
  async listPublicProperties(query: PublicPropertyQuery) {
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
              {
                bookings: {
                  some: {
                    status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
                    checkIn: { lt: query.checkOut },
                    checkOut: { gt: query.checkIn },
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

    const [total, properties] = await prisma.$transaction([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          bookings: {
            where: { review: { isNot: null } },
            select: {
              review: {
                select: { rating: true },
              },
            },
          },
          amenities: {
            select: { name: true },
          },
        },
      }),
    ]);

    return {
      data: properties.map((property) => ({
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
              select: { rating: true },
            },
          },
        },
      },
    });

    if (!property) return null;

    return {
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
      livingRoomSofaBeds: property.livingRoomSofaBeds,
      childrenAllowed: property.childrenAllowed,
      cribsAvailable: property.cribsAvailable,
      sizeM2: property.sizeM2,
      thumbnailUrl: normalizePropertyImageUrl(
        property.images.find((image) => image.isPrimary)?.url,
        property.type
      ),
      rating: buildRating(property.bookings),
      description: property.description,
      address: {
        line1: property.addressLine1,
        line2: property.addressLine2,
        city: property.city,
        postalCode: property.postalCode,
        country: property.country,
      },
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
