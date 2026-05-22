import { ListingStatus, TourCategory } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

export type PublicTourQuery = {
  page: number;
  limit: number;
  city?: string;
  category?: TourCategory;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
};

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

export const tourService = {
  async listPublicTours(query: PublicTourQuery) {
    const where = {
      status: ListingStatus.ACTIVE,
      ...(query.city
        ? { city: { contains: query.city, mode: "insensitive" as const } }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            pricePerPerson: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.minDuration !== undefined || query.maxDuration !== undefined
        ? {
            durationDays: {
              ...(query.minDuration !== undefined
                ? { gte: query.minDuration }
                : {}),
              ...(query.maxDuration !== undefined
                ? { lte: query.maxDuration }
                : {}),
            },
          }
        : {}),
    };

    const [total, tours] = await prisma.$transaction([
      prisma.tour.count({ where }),
      prisma.tour.findMany({
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
        },
      }),
    ]);

    return {
      data: tours.map((tour) => ({
        id: tour.id,
        title: tour.title,
        city: tour.city,
        country: tour.country,
        category: tour.category,
        pricePerPerson: tour.pricePerPerson.toNumber(),
        durationDays: tour.durationDays,
        minGroupSize: tour.minGroupSize,
        maxGroupSize: tour.maxGroupSize,
        thumbnailUrl: tour.images[0]?.url ?? null,
        rating: buildRating(tour.bookings),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getPublicTourById(id: string) {
    const tour = await prisma.tour.findFirst({
      where: {
        id,
        status: ListingStatus.ACTIVE,
      },
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        },
        itinerary: {
          orderBy: { dayNumber: "asc" },
        },
        inclusions: {
          orderBy: [{ type: "asc" }, { item: "asc" }],
        },
        availability: {
          where: { isActive: true },
          orderBy: { date: "asc" },
          select: {
            date: true,
            slotsTotal: true,
            slotsBooked: true,
          },
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
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

    if (!tour) return null;

    return {
      id: tour.id,
      title: tour.title,
      city: tour.city,
      country: tour.country,
      category: tour.category,
      pricePerPerson: tour.pricePerPerson.toNumber(),
      durationDays: tour.durationDays,
      minGroupSize: tour.minGroupSize,
      maxGroupSize: tour.maxGroupSize,
      thumbnailUrl: tour.images.find((image) => image.isPrimary)?.url ?? null,
      rating: buildRating(tour.bookings),
      description: tour.description,
      cancellationHours: tour.cancellationHours,
      cancellationPolicy: tour.cancellationPolicy,
      images: tour.images.map((image) => ({
        id: image.id,
        url: image.url,
        isPrimary: image.isPrimary,
      })),
      itinerary: tour.itinerary.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
      })),
      inclusions: {
        included: tour.inclusions
          .filter((item) => item.type === "INCLUDED")
          .map((item) => item.item),
        excluded: tour.inclusions
          .filter((item) => item.type === "EXCLUDED")
          .map((item) => item.item),
      },
      availability: tour.availability.map((slot) => ({
        date: slot.date.toISOString().slice(0, 10),
        slotsTotal: slot.slotsTotal,
        slotsBooked: slot.slotsBooked,
        slotsRemaining: slot.slotsTotal - slot.slotsBooked,
      })),
      host: tour.host,
      createdAt: tour.createdAt.toISOString(),
      updatedAt: tour.updatedAt.toISOString(),
    };
  },
};
