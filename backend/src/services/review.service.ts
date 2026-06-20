import { prisma } from "../lib/prisma";

export const reviewService = {
  async create(input: {
    userId: string;
    bookingId: string;
    rating: number;
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

      const review = await tx.review.create({
        data: {
          userId: input.userId,
          bookingId: booking.id,
          rating: input.rating,
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
            message: `Khách đã đánh giá ${input.rating}/5 cho ${itemTitle}.`,
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
      comment: review.comment,
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
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      guest: {
        name: review.user.displayName ?? review.user.name ?? review.user.email,
        email: review.user.email,
      },
      item: review.booking.property ?? review.booking.tour,
    }));
  },
};
