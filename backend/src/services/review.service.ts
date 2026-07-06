import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { BookingStatus } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

type ReviewCriteria = {
  cleanliness: number;
  comfort: number;
  location: number;
  amenities: number;
  value: number;
};

type ReviewImageInput = {
  name?: string;
  dataUrl: string;
};

type ReviewInput = {
  bookingId: string;
  rating: number;
  comment: string;
  criteria: ReviewCriteria;
  images?: ReviewImageInput[];
};

function clampRating(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function displayName(user: { displayName: string | null; name: string | null; email: string }) {
  return user.displayName || user.name || user.email;
}

function parseImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function serializeReview(review: {
  id: string;
  rating: number;
  cleanlinessRating: number;
  comfortRating: number;
  locationRating: number;
  amenitiesRating: number;
  valueRating: number;
  comment: string;
  images: unknown;
  revisionCount: number;
  lastEditedAt: Date | null;
  operatorFlaggedAt: Date | null;
  adminReportedAt: Date | null;
  adminReportNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string; name: string | null; displayName: string | null; avatar: string | null };
  booking: {
    id: string;
    checkIn: Date | null;
    checkOut: Date | null;
    property: { id: string; title: string; city: string; hostId: string } | null;
  };
}) {
  return {
    id: review.id,
    bookingId: review.booking.id,
    rating: review.rating,
    criteria: {
      cleanliness: review.cleanlinessRating,
      comfort: review.comfortRating,
      location: review.locationRating,
      amenities: review.amenitiesRating,
      value: review.valueRating,
    },
    comment: review.comment,
    images: parseImages(review.images),
    revisionCount: review.revisionCount,
    lastEditedAt: review.lastEditedAt?.toISOString() ?? null,
    operatorFlaggedAt: review.operatorFlaggedAt?.toISOString() ?? null,
    adminReportedAt: review.adminReportedAt?.toISOString() ?? null,
    adminReportNote: review.adminReportNote,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    guest: {
      id: review.user.id,
      name: displayName(review.user),
      email: review.user.email,
      avatar: review.user.avatar,
    },
    property: review.booking.property,
    stay: {
      checkIn: review.booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: review.booking.checkOut?.toISOString().slice(0, 10) ?? null,
    },
  };
}

function serializeSummary(reviews: Array<{ rating: number; cleanlinessRating: number; comfortRating: number; locationRating: number; amenitiesRating: number; valueRating: number }>) {
  const count = reviews.length;
  const average = (selector: (review: (typeof reviews)[number]) => number) =>
    count ? Number((reviews.reduce((sum, review) => sum + selector(review), 0) / count).toFixed(1)) : 0;

  return {
    average: count ? average((review) => review.rating) : null,
    count,
    criteria: {
      cleanliness: average((review) => review.cleanlinessRating),
      comfort: average((review) => review.comfortRating),
      location: average((review) => review.locationRating),
      amenities: average((review) => review.amenitiesRating),
      value: average((review) => review.valueRating),
    },
  };
}

async function saveReviewImages(userId: string, images: ReviewImageInput[] = []) {
  const safeImages = images.slice(0, 5).filter((image) => image.dataUrl.startsWith("data:image/"));
  if (!safeImages.length) return [];

  const uploadDir = path.join(process.cwd(), "uploads", "reviews");
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const [index, image] of safeImages.entries()) {
    const match = image.dataUrl.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
    if (!match) continue;
    const mime = match[1] ?? "";
    const payload = match[2];
    if (!payload) continue;
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const filename = `${userId}-${Date.now()}-${index}.${ext}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(payload, "base64"));
    urls.push(`/uploads/reviews/${filename}`);
  }

  return urls;
}

export const reviewService = {
  async listPublicPropertyReviews(propertyId: string) {
    const reviews = await prisma.review.findMany({
      where: { booking: { propertyId } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
      },
    });

    return {
      summary: serializeSummary(reviews),
      recent: reviews.slice(0, 3).map(serializeReview),
      all: reviews.map(serializeReview),
    };
  },

  async submit(userId: string, input: ReviewInput) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, userId, type: "PROPERTY" },
      include: {
        review: true,
        property: { select: { id: true, title: true, city: true, hostId: true } },
      },
    });

    if (!booking || !booking.property) return { kind: "BOOKING_NOT_FOUND" as const };
    const stayCompleted = booking.status === BookingStatus.COMPLETED || (booking.status === BookingStatus.CONFIRMED && booking.checkOut !== null && booking.checkOut <= new Date());
    if (!stayCompleted) return { kind: "STAY_NOT_COMPLETED" as const };

    const imageUrls = await saveReviewImages(userId, input.images);
    const rating = clampRating(input.rating);
    const baseData = {
      rating,
      cleanlinessRating: clampRating(input.criteria.cleanliness),
      comfortRating: clampRating(input.criteria.comfort),
      locationRating: clampRating(input.criteria.location),
      amenitiesRating: clampRating(input.criteria.amenities),
      valueRating: clampRating(input.criteria.value),
      comment: input.comment.trim(),
      ...(imageUrls.length ? { images: imageUrls } : {}),
      ...(rating < 3 && !booking.review?.operatorFlaggedAt ? { operatorFlaggedAt: new Date() } : {}),
    };

    const updateData: Prisma.ReviewUncheckedUpdateInput = {
      ...baseData,
      ...(booking.review ? { revisionCount: { increment: 1 }, lastEditedAt: new Date() } : {}),
    };

    const review = await prisma.$transaction(async (tx) => {
      const saved = booking.review
        ? await tx.review.update({
            where: { bookingId: booking.id },
            data: updateData,
            include: {
              user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
              booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
            },
          })
        : await tx.review.create({
            data: {
              userId,
              bookingId: booking.id,
              ...baseData,
            },
            include: {
              user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
              booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
            },
          });

      await tx.notification.create({
        data: {
          userId: booking.property!.hostId,
          type: "REVIEW_RECEIVED",
          title: `Đánh giá mới cho ${booking.property!.title}`,
          message: `${rating}/5 sao - ${input.comment.trim().slice(0, 120)}`,
          metadata: { reviewId: saved.id, bookingId: booking.id, propertyId: booking.property!.id },
        },
      });

      if (rating < 3) {
        const operators = await tx.operatorProvinceAssignment.findMany({
          where: { province: { name: { equals: booking.property!.city, mode: "insensitive" } } },
          select: { operatorId: true },
        });
        await tx.notification.createMany({
          data: operators.map((operator) => ({
            userId: operator.operatorId,
            type: "SYSTEM",
            title: "Đánh giá dưới 3 sao cần ghi nhận",
            message: `${booking.property!.title} vừa nhận đánh giá ${rating}/5 sao.`,
            metadata: { reviewId: saved.id, bookingId: booking.id, propertyId: booking.property!.id },
          })),
          skipDuplicates: true,
        });
      }

      return saved;
    });

    return { kind: "SUCCESS" as const, data: serializeReview(review) };
  },

  async listHostReviews(hostId: string) {
    const reviews = await prisma.review.findMany({
      where: { booking: { property: { hostId } } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
      },
    });
    return { summary: serializeSummary(reviews), reviews: reviews.map(serializeReview) };
  },

  async listOperatorReviews(cities: string[], sort = "recent") {
    const orderBy = sort === "low" ? { rating: "asc" as const } : sort === "high" ? { rating: "desc" as const } : { createdAt: "desc" as const };
    const reviews = await prisma.review.findMany({
      where: { booking: { property: { city: { in: cities, mode: "insensitive" } } } },
      orderBy,
      include: {
        user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
      },
    });
    const properties = new Map<string, { propertyId: string; title: string; city: string; count: number; average: number; total: number }>();
    reviews.forEach((review) => {
      const property = review.booking.property;
      if (!property) return;
      const current = properties.get(property.id) ?? { propertyId: property.id, title: property.title, city: property.city, count: 0, total: 0, average: 0 };
      current.count += 1;
      current.total += review.rating;
      current.average = Number((current.total / current.count).toFixed(1));
      properties.set(property.id, current);
    });
    const rankings = Array.from(properties.values()).sort((a, b) => sort === "few" ? a.count - b.count : sort === "many" ? b.count - a.count : b.average - a.average);
    return { recent: reviews.map(serializeReview), rankings };
  },

  async listAdminReviews(sort = "recent") {
    const orderBy = sort === "low" ? { rating: "asc" as const } : sort === "high" ? { rating: "desc" as const } : { createdAt: "desc" as const };
    const reviews = await prisma.review.findMany({
      orderBy,
      include: {
        user: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true, property: { select: { id: true, title: true, city: true, hostId: true } } } },
      },
    });
    return { summary: serializeSummary(reviews), reviews: reviews.map(serializeReview) };
  },

  async reportToOperator(adminId: string, reviewId: string, note: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { booking: { include: { property: true } } },
    });
    if (!review || !review.booking.property) return { kind: "REVIEW_NOT_FOUND" as const };

    const operators = await prisma.operatorProvinceAssignment.findMany({
      where: { province: { name: { equals: review.booking.property.city, mode: "insensitive" } } },
      select: { operatorId: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.review.update({
        where: { id: reviewId },
        data: { adminReportedAt: new Date(), adminReportNote: note },
      });
      await tx.notification.createMany({
        data: operators.map((operator) => ({
          userId: operator.operatorId,
          type: "SYSTEM",
          title: "Admin báo cáo đánh giá quan trọng",
          message: note,
          metadata: { reviewId, propertyId: review.booking.propertyId },
        })),
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "REVIEW_REPORTED_TO_OPERATOR",
          entity: "REVIEW",
          entityId: reviewId,
          newValue: { note, propertyId: review.booking.propertyId },
        },
      });
      return saved;
    });

    return { kind: "SUCCESS" as const, data: updated };
  },

  async openHostResponseConversation(hostId: string, reviewId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, booking: { property: { hostId } } },
      include: { booking: { include: { property: true } } },
    });
    if (!review || !review.booking.property) return { kind: "REVIEW_NOT_FOUND" as const };
    const conversation = await prisma.conversation.upsert({
      where: { propertyId_guestId: { propertyId: review.booking.property.id, guestId: review.userId } },
      update: { hiddenForHostAt: null },
      create: {
        propertyId: review.booking.property.id,
        guestId: review.userId,
        hostId,
      },
      select: { id: true, propertyId: true },
    });
    return { kind: "SUCCESS" as const, data: conversation };
  },
};
