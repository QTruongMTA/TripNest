import { BookingStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

function clampRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

function reviewToPublic(review: Awaited<ReturnType<typeof prisma.review.findFirst>> & {
  images?: Array<{ id: string; url: string; sortOrder: number }>;
  user?: { id: string; name: string | null; displayName: string | null; email: string; avatar: string | null };
  booking?: { propertyId: string | null; property?: { id: string; title: string; city: string; country: string } | null };
}) {
  return {
    id: review!.id,
    rating: review!.rating,
    cleanliness: review!.cleanliness,
    comfort: review!.comfort,
    location: review!.location,
    facilities: review!.facilities,
    staff: review!.staff,
    valueForMoney: review!.valueForMoney,
    comment: review!.comment,
    hostReply: review!.hostReply,
    hostRepliedAt: review!.hostRepliedAt?.toISOString() ?? null,
    createdAt: review!.createdAt.toISOString(),
    guest: review!.user
      ? {
          id: review!.user.id,
          name: review!.user.displayName ?? review!.user.name ?? review!.user.email,
          avatar: review!.user.avatar,
        }
      : null,
    property: review!.booking?.property ?? null,
    images: (review!.images ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({ id: img.id, url: img.url })),
  };
}

export const reviewService = {
  normalizeRatings(input: Record<string, unknown>) {
    const rating = clampRating(input.rating);
    const cleanliness = clampRating(input.cleanliness);
    const comfort = clampRating(input.comfort);
    const location = clampRating(input.location);
    const facilities = clampRating(input.facilities);
    const staff = clampRating(input.staff);
    const valueForMoney = clampRating(input.valueForMoney);
    if (!rating || !cleanliness || !comfort || !location || !facilities || !staff || !valueForMoney) {
      return null;
    }
    return { rating, cleanliness, comfort, location, facilities, staff, valueForMoney };
  },

  async createForBooking(input: {
    userId: string;
    bookingId: string;
    ratings: {
      rating: number;
      cleanliness: number;
      comfort: number;
      location: number;
      facilities: number;
      staff: number;
      valueForMoney: number;
    };
    comment: string;
    imageUrls: string[];
  }) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, userId: input.userId, status: BookingStatus.COMPLETED },
      select: { id: true, userId: true, review: { select: { id: true } } },
    });
    if (!booking) return { kind: "BOOKING_NOT_REVIEWABLE" as const };
    if (booking.review) return { kind: "REVIEW_ALREADY_EXISTS" as const };

    const comment = input.comment.trim();
    if (comment.length < 10) return { kind: "COMMENT_TOO_SHORT" as const };

    const safeImages = input.imageUrls
      .filter((url) => typeof url === "string" && (url.startsWith("data:image/") || /^https?:\/\//.test(url)))
      .slice(0, 5);

    const review = await prisma.review.create({
      data: {
        userId: input.userId,
        bookingId: input.bookingId,
        ...input.ratings,
        comment,
        images: {
          create: safeImages.map((url, index) => ({ url, sortOrder: index })),
        },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { id: true, name: true, displayName: true, email: true, avatar: true } },
        booking: { select: { property: { select: { id: true, title: true, city: true, country: true } }, propertyId: true } },
      },
    });

    return { kind: "SUCCESS" as const, data: reviewToPublic(review) };
  },

  async listPublic(filters: { propertyId?: string }) {
    const reviews = await prisma.review.findMany({
      where: filters.propertyId ? { booking: { propertyId: filters.propertyId } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { id: true, name: true, displayName: true, email: true, avatar: true } },
        booking: { select: { property: { select: { id: true, title: true, city: true, country: true } }, propertyId: true } },
      },
    });
    return reviews.map((r) => reviewToPublic(r));
  },

  async listForHost(hostId: string) {
    const reviews = await prisma.review.findMany({
      where: { booking: { property: { hostId } } },
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { id: true, name: true, displayName: true, email: true, avatar: true } },
        booking: { select: { property: { select: { id: true, title: true, city: true, country: true } }, propertyId: true } },
      },
    });
    return reviews.map((r) => reviewToPublic(r));
  },

  async replyAsHost(hostId: string, reviewId: string, reply: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, booking: { property: { hostId } } },
      select: { id: true },
    });
    if (!review) return { kind: "NOT_FOUND" as const };

    const cleanReply = reply.trim();
    if (cleanReply.length < 2) return { kind: "INVALID_REPLY" as const };

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { hostReply: cleanReply, hostRepliedAt: new Date() },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        user: { select: { id: true, name: true, displayName: true, email: true, avatar: true } },
        booking: { select: { property: { select: { id: true, title: true, city: true, country: true } }, propertyId: true } },
      },
    });

    return { kind: "SUCCESS" as const, data: reviewToPublic(updated) };
  },
};
