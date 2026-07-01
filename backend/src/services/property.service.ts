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

type ReviewForRating = {
  rating: number;
  cleanliness: number;
  comfort: number;
  location: number;
  facilities: number;
  staff: number;
  valueForMoney: number;
};

function buildRating(bookings: Array<{ review: ReviewForRating | null }>) {
  const reviews = bookings
    .map((booking) => booking.review)
    .filter((review): review is ReviewForRating => review !== null);

  if (reviews.length === 0) {
    return { average: null, count: 0, breakdown: null };
  }

  const avg = (key: keyof ReviewForRating) =>
    Number((reviews.reduce((sum, review) => sum + review[key], 0) / reviews.length).toFixed(1));

  return {
    average: avg("rating"),
    count: reviews.length,
    breakdown: {
      cleanliness: avg("cleanliness"),
      comfort: avg("comfort"),
      location: avg("location"),
      facilities: avg("facilities"),
      staff: avg("staff"),
      valueForMoney: avg("valueForMoney"),
    },
  };
}

export const propertyService = {
  async listPublicProperties(query: PublicPropertyQuery) {
    const now = new Date();
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
                select: {
                  rating: true, cleanliness: true, comfort: true, location: true,
                  facilities: true, staff: true, valueForMoney: true,
                },
              },
            },
          },
          amenities: {
            select: { name: true },
          },
          promotions: {
            where: {
              isActive: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
            take: 1,
            orderBy: { discountValue: "desc" },
            select: { id: true, code: true, discountType: true, discountValue: true },
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
        promotion: property.promotions[0]
          ? {
              id: property.promotions[0].id,
              code: property.promotions[0].code,
              discountType: property.promotions[0].discountType,
              discountValue: property.promotions[0].discountValue.toNumber(),
            }
          : null,
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
    const now = new Date();
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
        ratePlans: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            description: true,
            discountType: true,
            discountValue: true,
            minOrderValue: true,
            maxUses: true,
            usedCount: true,
            endDate: true,
          },
        },
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
          orderBy: { createdAt: "desc" },
          select: {
            review: {
              select: {
                id: true,
                rating: true,
                cleanliness: true,
                comfort: true,
                location: true,
                facilities: true,
                staff: true,
                valueForMoney: true,
                comment: true,
                hostReply: true,
                hostRepliedAt: true,
                createdAt: true,
                user: { select: { id: true, name: true, displayName: true, email: true, avatar: true } },
                images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
              },
            },
          },
        },
      },
    });

    if (!property) return null;

    const activePromotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { propertyId: property.id },
          { hostId: property.host.id, propertyId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderValue: true,
        maxUses: true,
        usedCount: true,
        endDate: true,
      },
    });

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
      reviews: property.bookings.flatMap((booking) => {
        const review = booking.review;
        if (!review) return [];
        return [{
          id: review.id,
          rating: review.rating,
          cleanliness: review.cleanliness,
          comfort: review.comfort,
          location: review.location,
          facilities: review.facilities,
          staff: review.staff,
          valueForMoney: review.valueForMoney,
          comment: review.comment,
          hostReply: review.hostReply,
          hostRepliedAt: review.hostRepliedAt?.toISOString() ?? null,
          createdAt: review.createdAt.toISOString(),
          guest: {
            id: review.user.id,
            name: review.user.displayName ?? review.user.name ?? review.user.email,
            avatar: review.user.avatar,
          },
          images: review.images.map((img) => ({ id: img.id, url: img.url })),
        }];
      }),
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
        id: rp.id,
        name: rp.name,
        type: rp.type,
        priceAdjustmentType: rp.priceAdjustmentType,
        priceAdjustmentValue: rp.priceAdjustmentValue.toNumber(),
        cancellationPolicy: rp.cancellationPolicy,
        cancellationFreeDays: rp.cancellationFreeDays,
        minStay: rp.minStay,
        maxStay: rp.maxStay,
        breakfastIncluded: rp.breakfastIncluded,
        sortOrder: rp.sortOrder,
      })),
      promotions: activePromotions
        .filter((promo) => promo.maxUses === null || promo.usedCount < promo.maxUses)
        .map((promo) => ({
          id: promo.id,
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountValue: promo.discountValue.toNumber(),
          minOrderValue: promo.minOrderValue?.toNumber() ?? null,
          maxUses: promo.maxUses,
          usedCount: promo.usedCount,
          endDate: promo.endDate.toISOString().slice(0, 10),
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
      images: property.images.map((image) => ({
        id: image.id,
        url: normalizePropertyImageUrl(image.url, property.type),
        isPrimary: image.isPrimary,
      })),
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
