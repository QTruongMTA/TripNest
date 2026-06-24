import { prisma } from "../lib/prisma";

export const reviewService = {
  async create(input: {
    userId: string;
    bookingId: string;
    cleanlinessRating: number;
    locationRating: number;
    serviceRating: number;
    valueRating: number;
    comment: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, userId: input.userId },
        include: {
          review: true,
          property: { select: { hostId: true, title: true } },
          tour: { select: { hostId: true, title: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "COMPLETED" || booking.paymentStatus !== "PAID") {
        return { kind: "BOOKING_NOT_REVIEWABLE" as const };
      }
      if (booking.review) return { kind: "REVIEW_ALREADY_EXISTS" as const };

      const rating = Math.round(
        (input.cleanlinessRating +
          input.locationRating +
          input.serviceRating +
          input.valueRating) /
          4
      );
      const review = await tx.review.create({
        data: {
          userId: input.userId,
          bookingId: booking.id,
          rating,
          cleanlinessRating: input.cleanlinessRating,
          locationRating: input.locationRating,
          serviceRating: input.serviceRating,
          valueRating: input.valueRating,
          comment: input.comment.trim(),
        },
      });

      const hostId = booking.property?.hostId ?? booking.tour?.hostId;
      const itemTitle = booking.property?.title ?? booking.tour?.title ?? "dịch vụ";
      if (hostId) {
        await tx.notification.create({
          data: {
            userId: hostId,
            type: "REVIEW_RECEIVED",
            title: "Bạn có đánh giá mới",
            message: `Khách đã đánh giá ${rating}/5 cho ${itemTitle}.`,
            metadata: {
              bookingId: booking.id,
              reviewId: review.id,
              action: "REVIEW_CREATED",
            },
          },
        });
      }

      return {
        kind: "SUCCESS" as const,
        data: {
          ...review,
          createdAt: review.createdAt.toISOString(),
        },
      };
    });
  },

  async listPropertyReviews(propertyId: string) {
    const reviews = await prisma.review.findMany({
      where: { booking: { propertyId, status: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, displayName: true, avatar: true } },
      },
    });

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      criteria: {
        cleanliness: review.cleanlinessRating,
        location: review.locationRating,
        service: review.serviceRating,
        value: review.valueRating,
      },
      comment: review.comment,
      hostResponse: review.hostResponse,
      hostRespondedAt: review.hostRespondedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      guest: {
        name: review.user.displayName ?? review.user.name ?? "Khách TripNest",
        avatar: review.user.avatar,
      },
    }));
  },

  async listHostReviews(hostId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        booking: {
          OR: [{ property: { hostId } }, { tour: { hostId } }],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, displayName: true, email: true } },
        booking: {
          select: {
            id: true,
            property: { select: { id: true, title: true } },
            tour: { select: { id: true, title: true } },
          },
        },
      },
    });

    return reviews.map((review) => ({
      id: review.id,
      bookingId: review.booking.id,
      rating: review.rating,
      criteria: {
        cleanliness: review.cleanlinessRating,
        location: review.locationRating,
        service: review.serviceRating,
        value: review.valueRating,
      },
      comment: review.comment,
      hostResponse: review.hostResponse,
      hostRespondedAt: review.hostRespondedAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      guest: {
        name: review.user.displayName ?? review.user.name ?? review.user.email,
        email: review.user.email,
      },
      item: review.booking.property ?? review.booking.tour,
    }));
  },

  async respondAsHost(input: { hostId: string; reviewId: string; response: string }) {
    const review = await prisma.review.findFirst({
      where: {
        id: input.reviewId,
        booking: {
          OR: [{ property: { hostId: input.hostId } }, { tour: { hostId: input.hostId } }],
        },
      },
      select: { id: true },
    });

    if (!review) return null;

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        hostResponse: input.response.trim(),
        hostRespondedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      hostResponse: updated.hostResponse,
      hostRespondedAt: updated.hostRespondedAt?.toISOString() ?? null,
    };
  },
};
