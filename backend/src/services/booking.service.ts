import { BookingMethod, BookingStatus, BookingType, CancellationPolicy, ListingStatus, ModificationStatus, NotificationType, PaymentMethod, PaymentStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { bookingMessageService, createSystemMessage } from "./booking-message.service";
import { pricingService } from "./pricing.service";

// Statuses that still hold a slot on the calendar
const SLOT_HOLDING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED] as const;

// Statuses that allow cancellation
const CANCELLABLE_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED] as const;

// â”€â”€ Event type constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BookingEventType = {
  CREATED:            "CREATED",
  CONFIRMED:          "CONFIRMED",
  CONFIRMED_AUTO:     "CONFIRMED_AUTO",
  PAYMENT_CREATED:    "PAYMENT_CREATED",
  CANCELLED_BY_GUEST: "CANCELLED_BY_GUEST",
  CANCELLED_BY_HOST:  "CANCELLED_BY_HOST",
  CANCELLED_BY_ADMIN: "CANCELLED_BY_ADMIN",
  NO_SHOW:            "NO_SHOW",
  COMPLETED:          "COMPLETED",
  EXPIRED:            "EXPIRED",
  REFUND_FULL:        "REFUND_FULL",
  REFUND_PARTIAL:     "REFUND_PARTIAL",
  REFUND_DENIED:      "REFUND_DENIED",
  PAYMENT_PENDING_VERIFICATION: "PAYMENT_PENDING_VERIFICATION",
  PAYMENT_CONFIRMED:  "PAYMENT_CONFIRMED",
} as const;

// â”€â”€ Refund estimate helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function computeRefundEstimate(booking: {
  status: string;
  checkIn: Date | null;
  payment: { status: string; amount: { toNumber(): number } } | null;
  ratePlan?: {
    cancellationPolicy: string | null;
    cancellationFreeDays: number | null;
  } | null;
  property: {
    cancellationPolicy: string;
    cancellationFreeDays: number;
  } | null;
}) {
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
    return { eligible: false as const, amount: null, percentage: null, reason: "ÄÆ¡n Ä‘áº·t khÃ´ng cÃ²n á»Ÿ tráº¡ng thÃ¡i cÃ³ thá»ƒ há»§y." };
  }

  if (!booking.payment || booking.payment.status !== PaymentStatus.PAID) {
    return { eligible: true as const, amount: 0, percentage: 100, reason: "ChÆ°a thanh toÃ¡n â€” há»§y miá»…n phÃ­." };
  }

  const policy = booking.ratePlan?.cancellationPolicy
    ?? booking.property?.cancellationPolicy
    ?? CancellationPolicy.FLEXIBLE;
  const freeDays = booking.ratePlan?.cancellationFreeDays
    ?? booking.property?.cancellationFreeDays
    ?? 1;
  const paidAmount = booking.payment.amount.toNumber();
  const now = new Date();
  const daysUntilCheckIn = booking.checkIn
    ? Math.ceil((booking.checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  if (policy === CancellationPolicy.NON_REFUNDABLE || policy === CancellationPolicy.STRICT) {
    return { eligible: false as const, amount: 0, percentage: 0, reason: "ChÃ­nh sÃ¡ch khÃ´ng hoÃ n tiá»n." };
  }

  if (daysUntilCheckIn >= freeDays) {
    return { eligible: true as const, amount: paidAmount, percentage: 100, reason: `Há»§y trÆ°á»›c ${freeDays} ngÃ y â€” hoÃ n 100%.` };
  }

  if (policy === CancellationPolicy.MODERATE) {
    return { eligible: true as const, amount: Math.round(paidAmount * 0.5), percentage: 50, reason: "Há»§y muá»™n theo chÃ­nh sÃ¡ch Vá»«a pháº£i â€” hoÃ n 50%." };
  }

  return { eligible: false as const, amount: 0, percentage: 0, reason: "Há»§y muá»™n theo chÃ­nh sÃ¡ch Linh hoáº¡t â€” quÃ¡ háº¡n miá»…n phÃ­." };
}

// â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const bookingService = {

  // â”€â”€ Host: list all bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async listHostBookings(hostId: string) {
    const bookings = await prisma.booking.findMany({
      where: { type: "PROPERTY", property: { hostId } },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: {
          select: {
            id: true, title: true, city: true, country: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
        modifications: {
          where: { status: ModificationStatus.PENDING },
          take: 1,
          select: { id: true, requesterRole: true },
        },
      },
    });

    const ids = bookings.map((b) => b.id);
    const unreadCounts = await bookingMessageService.getUnreadCountsForHost(ids);

    return bookings.map((b) => ({
      id: b.id,
      status: b.status,
      paymentStatus: b.paymentStatus,
      checkIn: b.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: b.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: b.numGuests,
      totalPrice: b.totalPrice.toNumber(),
      notes: b.notes,
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      cancelledReason: b.cancelledReason ?? null,
      createdAt: b.createdAt.toISOString(),
      guest: b.user,
      property: b.property
        ? { ...b.property, thumbnailUrl: b.property.images[0]?.url ?? null }
        : null,
      pendingModification: b.modifications[0]
        ? { id: b.modifications[0].id, requesterRole: b.modifications[0].requesterRole }
        : null,
      unreadCount: unreadCounts[b.id] ?? 0,
    }));
  },

  // â”€â”€ Host: single booking detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getHostBookingDetail(input: { hostId: string; bookingId: string }) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        property: {
          select: {
            id: true, title: true, city: true, country: true,
            pricePerNight: true, cleaningFee: true,
            cancellationPolicy: true, cancellationFreeDays: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
        ratePlan: {
          select: {
            id: true, name: true, type: true,
            priceAdjustmentType: true, priceAdjustmentValue: true,
            cancellationPolicy: true, cancellationFreeDays: true,
            minStay: true, maxStay: true, breakfastIncluded: true,
          },
        },
        payment: {
          select: { id: true, amount: true, status: true, method: true, paidAt: true, refundAmount: true, transferReference: true },
        },
        review: {
          select: {
            id: true, rating: true, cleanliness: true, comfort: true, location: true,
            facilities: true, staff: true, valueForMoney: true, comment: true,
            hostReply: true, hostRepliedAt: true, createdAt: true,
            images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
          select: { id: true, type: true, actorId: true, actorRole: true, message: true, metadata: true, createdAt: true },
        },
        modifications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, requestedBy: true, requesterRole: true, status: true,
            newCheckIn: true, newCheckOut: true, newNumGuests: true,
            oldCheckIn: true, oldCheckOut: true, oldNumGuests: true,
            oldTotalPrice: true, newTotalPrice: true, priceDelta: true,
            expiresAt: true, respondedAt: true, respondedBy: true, rejectionReason: true, createdAt: true,
          },
        },
        disputes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, status: true, subject: true, description: true,
            resolution: true, resolvedAt: true, escalatedAt: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });

    if (!booking) return null;

    const nights = booking.checkIn && booking.checkOut
      ? Math.round((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const daysUntilCheckIn = booking.checkIn
      ? Math.ceil((booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      notes: booking.notes,
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelledReason: booking.cancelledReason ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      nights,
      daysUntilCheckIn,
      guest: booking.user,
      property: booking.property
        ? {
            id: booking.property.id,
            title: booking.property.title,
            city: booking.property.city,
            country: booking.property.country,
            pricePerNight: booking.property.pricePerNight.toNumber(),
            cleaningFee: booking.property.cleaningFee?.toNumber() ?? null,
            cancellationPolicy: booking.property.cancellationPolicy,
            cancellationFreeDays: booking.property.cancellationFreeDays,
            thumbnailUrl: booking.property.images[0]?.url ?? null,
          }
        : null,
      ratePlan: booking.ratePlan
        ? {
            id: booking.ratePlan.id,
            name: booking.ratePlan.name,
            type: booking.ratePlan.type,
            priceAdjustmentType: booking.ratePlan.priceAdjustmentType,
            priceAdjustmentValue: booking.ratePlan.priceAdjustmentValue.toNumber(),
            cancellationPolicy: booking.ratePlan.cancellationPolicy,
            cancellationFreeDays: booking.ratePlan.cancellationFreeDays,
            minStay: booking.ratePlan.minStay,
            maxStay: booking.ratePlan.maxStay,
            breakfastIncluded: booking.ratePlan.breakfastIncluded,
          }
        : null,
      payment: booking.payment
        ? {
            id: booking.payment.id,
            amount: booking.payment.amount.toNumber(),
            status: booking.payment.status,
            method: booking.payment.method,
            paidAt: booking.payment.paidAt?.toISOString() ?? null,
            refundAmount: booking.payment.refundAmount?.toNumber() ?? null,
            transferReference: booking.payment.transferReference ?? null,
          }
        : null,
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            cleanliness: booking.review.cleanliness,
            comfort: booking.review.comfort,
            location: booking.review.location,
            facilities: booking.review.facilities,
            staff: booking.review.staff,
            valueForMoney: booking.review.valueForMoney,
            comment: booking.review.comment,
            hostReply: booking.review.hostReply,
            hostRepliedAt: booking.review.hostRepliedAt?.toISOString() ?? null,
            createdAt: booking.review.createdAt.toISOString(),
            images: booking.review.images,
          }
        : null,
      events: booking.events.map((e) => ({
        id: e.id,
        type: e.type,
        actorRole: e.actorRole,
        message: e.message,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
      modifications: booking.modifications.map((m) => ({
        id: m.id,
        requestedBy: m.requestedBy,
        requesterRole: m.requesterRole,
        status: m.status,
        newCheckIn: m.newCheckIn?.toISOString().slice(0, 10) ?? null,
        newCheckOut: m.newCheckOut?.toISOString().slice(0, 10) ?? null,
        newNumGuests: m.newNumGuests,
        oldCheckIn: m.oldCheckIn?.toISOString().slice(0, 10) ?? null,
        oldCheckOut: m.oldCheckOut?.toISOString().slice(0, 10) ?? null,
        oldNumGuests: m.oldNumGuests,
        oldTotalPrice: m.oldTotalPrice.toNumber(),
        newTotalPrice: m.newTotalPrice.toNumber(),
        priceDelta: m.priceDelta.toNumber(),
        expiresAt: m.expiresAt.toISOString(),
        respondedAt: m.respondedAt?.toISOString() ?? null,
        respondedBy: m.respondedBy,
        rejectionReason: m.rejectionReason,
        createdAt: m.createdAt.toISOString(),
      })),
      disputes: booking.disputes.map((d) => ({
        id: d.id,
        status: d.status,
        subject: d.subject,
        description: d.description,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        escalatedAt: d.escalatedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      refundEstimate: computeRefundEstimate({
        status: booking.status,
        checkIn: booking.checkIn,
        payment: booking.payment,
        ratePlan: booking.ratePlan,
        property: booking.property,
      }),
    };
  },

  // â”€â”€ Traveler: single booking detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getTravelerBookingDetail(input: { userId: string; bookingId: string }) {
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, userId: input.userId },
      include: {
        property: {
          select: {
            id: true, title: true, city: true, country: true,
            pricePerNight: true, cleaningFee: true,
            cancellationPolicy: true, cancellationFreeDays: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
        ratePlan: {
          select: {
            id: true, name: true, type: true,
            priceAdjustmentType: true, priceAdjustmentValue: true,
            cancellationPolicy: true, cancellationFreeDays: true,
            minStay: true, maxStay: true, breakfastIncluded: true,
          },
        },
        payment: {
          select: { id: true, amount: true, status: true, method: true, paidAt: true, refundAmount: true, transferReference: true },
        },
        review: {
          select: {
            id: true, rating: true, cleanliness: true, comfort: true, location: true,
            facilities: true, staff: true, valueForMoney: true, comment: true,
            hostReply: true, hostRepliedAt: true, createdAt: true,
            images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
          select: { id: true, type: true, actorId: true, actorRole: true, message: true, metadata: true, createdAt: true },
        },
        modifications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, requestedBy: true, requesterRole: true, status: true,
            newCheckIn: true, newCheckOut: true, newNumGuests: true,
            oldCheckIn: true, oldCheckOut: true, oldNumGuests: true,
            oldTotalPrice: true, newTotalPrice: true, priceDelta: true,
            expiresAt: true, respondedAt: true, respondedBy: true, rejectionReason: true, createdAt: true,
          },
        },
        disputes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, status: true, subject: true, description: true,
            resolution: true, resolvedAt: true, escalatedAt: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });

    if (!booking) return null;

    const nights = booking.checkIn && booking.checkOut
      ? Math.round((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysUntilCheckIn = booking.checkIn
      ? Math.ceil((booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: booking.id,
      type: booking.type,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      notes: booking.notes,
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelledReason: booking.cancelledReason ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      nights,
      daysUntilCheckIn,
      property: booking.property
        ? {
            id: booking.property.id,
            title: booking.property.title,
            city: booking.property.city,
            country: booking.property.country,
            pricePerNight: booking.property.pricePerNight.toNumber(),
            cleaningFee: booking.property.cleaningFee?.toNumber() ?? null,
            cancellationPolicy: booking.property.cancellationPolicy,
            cancellationFreeDays: booking.property.cancellationFreeDays,
            thumbnailUrl: booking.property.images[0]?.url ?? null,
          }
        : null,
      ratePlan: booking.ratePlan
        ? {
            id: booking.ratePlan.id,
            name: booking.ratePlan.name,
            type: booking.ratePlan.type,
            priceAdjustmentType: booking.ratePlan.priceAdjustmentType,
            priceAdjustmentValue: booking.ratePlan.priceAdjustmentValue.toNumber(),
            cancellationPolicy: booking.ratePlan.cancellationPolicy,
            cancellationFreeDays: booking.ratePlan.cancellationFreeDays,
            minStay: booking.ratePlan.minStay,
            maxStay: booking.ratePlan.maxStay,
            breakfastIncluded: booking.ratePlan.breakfastIncluded,
          }
        : null,
      payment: booking.payment
        ? {
            id: booking.payment.id,
            amount: booking.payment.amount.toNumber(),
            status: booking.payment.status,
            method: booking.payment.method,
            paidAt: booking.payment.paidAt?.toISOString() ?? null,
            refundAmount: booking.payment.refundAmount?.toNumber() ?? null,
            transferReference: booking.payment.transferReference ?? null,
          }
        : null,
      review: booking.review
        ? {
            id: booking.review.id,
            rating: booking.review.rating,
            cleanliness: booking.review.cleanliness,
            comfort: booking.review.comfort,
            location: booking.review.location,
            facilities: booking.review.facilities,
            staff: booking.review.staff,
            valueForMoney: booking.review.valueForMoney,
            comment: booking.review.comment,
            hostReply: booking.review.hostReply,
            hostRepliedAt: booking.review.hostRepliedAt?.toISOString() ?? null,
            createdAt: booking.review.createdAt.toISOString(),
            images: booking.review.images,
          }
        : null,
      events: booking.events.map((e) => ({
        id: e.id, type: e.type, actorRole: e.actorRole,
        message: e.message, metadata: e.metadata, createdAt: e.createdAt.toISOString(),
      })),
      modifications: booking.modifications.map((m) => ({
        id: m.id, requestedBy: m.requestedBy, requesterRole: m.requesterRole, status: m.status,
        newCheckIn: m.newCheckIn?.toISOString().slice(0, 10) ?? null,
        newCheckOut: m.newCheckOut?.toISOString().slice(0, 10) ?? null,
        newNumGuests: m.newNumGuests,
        oldCheckIn: m.oldCheckIn?.toISOString().slice(0, 10) ?? null,
        oldCheckOut: m.oldCheckOut?.toISOString().slice(0, 10) ?? null,
        oldNumGuests: m.oldNumGuests,
        oldTotalPrice: m.oldTotalPrice.toNumber(), newTotalPrice: m.newTotalPrice.toNumber(),
        priceDelta: m.priceDelta.toNumber(),
        expiresAt: m.expiresAt.toISOString(), respondedAt: m.respondedAt?.toISOString() ?? null,
        respondedBy: m.respondedBy, rejectionReason: m.rejectionReason, createdAt: m.createdAt.toISOString(),
      })),
      disputes: booking.disputes.map((d) => ({
        id: d.id,
        status: d.status,
        subject: d.subject,
        description: d.description,
        resolution: d.resolution,
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        escalatedAt: d.escalatedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      refundEstimate: computeRefundEstimate({
        status: booking.status,
        checkIn: booking.checkIn,
        payment: booking.payment,
        ratePlan: booking.ratePlan,
        property: booking.property,
      }),
    };
  },

  // â”€â”€ Host: confirm booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async updateHostPropertyBookingStatus(input: { hostId: string; bookingId: string; status: "CONFIRMED" }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        select: { id: true, status: true, totalPrice: true, userId: true, property: { select: { title: true } } },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "PENDING") return { kind: "BOOKING_NOT_PENDING" as const };

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status, expiresAt: null },
        select: { id: true, status: true, updatedAt: true },
      });

      await tx.payment.create({
        data: { bookingId: input.bookingId, amount: booking.totalPrice, currency: "VND", method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID },
      });

      await tx.bookingEvent.createMany({
        data: [
          { bookingId: input.bookingId, actorId: input.hostId, actorRole: "HOST", type: BookingEventType.CONFIRMED, message: "Host Ä‘Ã£ xÃ¡c nháº­n Ä‘Æ¡n Ä‘áº·t." },
          { bookingId: input.bookingId, actorRole: "SYSTEM", type: BookingEventType.PAYMENT_CREATED, message: "Báº£n ghi thanh toÃ¡n Ä‘Æ°á»£c táº¡o, chá» thu tiá»n." },
        ],
      });

      await createSystemMessage(tx, input.bookingId, "Host Ä‘Ã£ xÃ¡c nháº­n Ä‘áº·t phÃ²ng cá»§a báº¡n. Vui lÃ²ng hoÃ n táº¥t thanh toÃ¡n Ä‘á»ƒ giá»¯ chá»—.");

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.BOOKING_CONFIRMED,
          title: "Äáº·t phÃ²ng thÃ nh cÃ´ng",
          message: `ÄÆ¡n Ä‘áº·t ${booking.property?.title ?? "phÃ²ng"} cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t thÃ nh cÃ´ng.`,
          metadata: { bookingId: booking.id, action: "BOOKING_APPROVED" },
        },
      });

      return { kind: "SUCCESS" as const, data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() } };
    });
  },

  // â”€â”€ Host: cancel booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async cancelByHost(input: { hostId: string; bookingId: string; reason?: string | null }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        select: { id: true, status: true, userId: true, property: { select: { title: true } }, payment: { select: { id: true, status: true, amount: true } } },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) return { kind: "BOOKING_NOT_CANCELLABLE" as const };

      const cancelledAt = new Date();
      const hostCancelPaymentStatus = booking.payment?.status === PaymentStatus.PAID ? PaymentStatus.REFUNDED : undefined;
      await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          status: BookingStatus.CANCELLED_BY_HOST,
          cancelledAt,
          cancelledReason: input.reason?.trim() || null,
          ...(hostCancelPaymentStatus !== undefined ? { paymentStatus: hostCancelPaymentStatus } : {}),
        },
      });

      const events: // biome-ignore lint: prisma json type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[] = [
        { bookingId: input.bookingId, actorId: input.hostId, actorRole: "HOST", type: BookingEventType.CANCELLED_BY_HOST, message: `Host Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""}`, metadata: input.reason ? { reason: input.reason.trim() } : undefined },
      ];

      if (booking.payment?.status === PaymentStatus.PAID) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: PaymentStatus.REFUNDED, refundAmount: booking.payment.amount, refundedAt: cancelledAt },
        });
        events.push({ bookingId: input.bookingId, actorRole: "SYSTEM", type: BookingEventType.REFUND_FULL, message: `HoÃ n tiá»n 100% cho khÃ¡ch.`, metadata: { refundAmount: booking.payment.amount } });
      }

      await tx.bookingEvent.createMany({ data: events });

      await createSystemMessage(
        tx, input.bookingId,
        `Chá»§ nhÃ  Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""}${booking.payment?.status === PaymentStatus.PAID ? " Tiá»n sáº½ Ä‘Æ°á»£c hoÃ n tráº£ 100%." : ""}`,
      );

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.BOOKING_CANCELLED,
          title: "ÄÆ¡n Ä‘áº·t bá»‹ há»§y bá»Ÿi chá»§ nhÃ ",
          message: `ÄÆ¡n Ä‘áº·t ${booking.property?.title ?? "phÃ²ng"} Ä‘Ã£ bá»‹ chá»§ nhÃ  há»§y.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""}`,
          metadata: { bookingId: booking.id, action: "BOOKING_CANCELLED_BY_HOST" },
        },
      });

      return { kind: "SUCCESS" as const, data: { id: input.bookingId, status: BookingStatus.CANCELLED_BY_HOST, cancelledAt: cancelledAt.toISOString() } };
    });
  },

  // â”€â”€ Guest: cancel booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async cancelByGuest(input: { userId: string; bookingId: string; reason?: string | null }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, userId: input.userId },
        select: {
          id: true, status: true, checkIn: true,
          property: { select: { hostId: true, title: true, cancellationPolicy: true, cancellationFreeDays: true } },
          ratePlan: { select: { cancellationPolicy: true, cancellationFreeDays: true } },
          payment: { select: { id: true, status: true, amount: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (!(CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) return { kind: "BOOKING_NOT_CANCELLABLE" as const };

      let newPaymentStatus = booking.payment?.status ?? PaymentStatus.UNPAID;
      let refundAmount: number | null = null;
      let refundEventType: string = BookingEventType.REFUND_DENIED;

      if (booking.payment?.status === PaymentStatus.PAID) {
        const paidAmount = booking.payment.amount.toNumber();
        const policy = booking.ratePlan?.cancellationPolicy
          ?? booking.property?.cancellationPolicy
          ?? CancellationPolicy.FLEXIBLE;
        const freeDays = booking.ratePlan?.cancellationFreeDays
          ?? booking.property?.cancellationFreeDays
          ?? 1;
        const daysUntilCheckIn = booking.checkIn
          ? Math.ceil((booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : Infinity;

        if (policy === CancellationPolicy.NON_REFUNDABLE || policy === CancellationPolicy.STRICT) {
          newPaymentStatus = PaymentStatus.PAID;
        } else if (daysUntilCheckIn >= freeDays) {
          newPaymentStatus = PaymentStatus.REFUNDED;
          refundAmount = paidAmount;
          refundEventType = BookingEventType.REFUND_FULL;
        } else if (policy === CancellationPolicy.MODERATE) {
          newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
          refundAmount = Math.round(paidAmount * 0.5);
          refundEventType = BookingEventType.REFUND_PARTIAL;
        } else {
          newPaymentStatus = PaymentStatus.PAID;
        }
      }

      const cancelledAt = new Date();
      await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          status: BookingStatus.CANCELLED_BY_GUEST,
          cancelledAt,
          cancelledReason: input.reason?.trim() || null,
          ...(booking.payment ? { paymentStatus: newPaymentStatus } : {}),
        },
      });

      if (booking.payment) {
        const isRefundStatus = newPaymentStatus === PaymentStatus.REFUNDED || newPaymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: newPaymentStatus,
            ...(refundAmount !== null ? { refundAmount } : {}),
            ...(isRefundStatus ? { refundedAt: cancelledAt } : {}),
          },
        });
      }

      const events: // biome-ignore lint: prisma json type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[] = [
        { bookingId: input.bookingId, actorId: input.userId, actorRole: "GUEST", type: BookingEventType.CANCELLED_BY_GUEST, message: `KhÃ¡ch Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""}` },
        {
          bookingId: input.bookingId, actorRole: "SYSTEM", type: refundEventType,
          message: refundEventType === BookingEventType.REFUND_FULL
            ? `HoÃ n tiá»n 100% (${refundAmount?.toLocaleString("vi-VN")} â‚«).`
            : refundEventType === BookingEventType.REFUND_PARTIAL
              ? `HoÃ n tiá»n 50% (${refundAmount?.toLocaleString("vi-VN")} â‚«).`
              : "KhÃ´ng hoÃ n tiá»n theo chÃ­nh sÃ¡ch.",
          metadata: refundAmount !== null ? { refundAmount } : undefined,
        },
      ];
      await tx.bookingEvent.createMany({ data: events });

      await createSystemMessage(
        tx, input.bookingId,
        `Báº¡n Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""} ${
          refundEventType === BookingEventType.REFUND_FULL
            ? `HoÃ n tiá»n 100% (${refundAmount?.toLocaleString("vi-VN")} â‚«).`
            : refundEventType === BookingEventType.REFUND_PARTIAL
              ? `HoÃ n tiá»n 50% (${refundAmount?.toLocaleString("vi-VN")} â‚«).`
              : "KhÃ´ng hoÃ n tiá»n theo chÃ­nh sÃ¡ch."
        }`,
      );

      if (booking.property?.hostId) {
        await tx.notification.create({
          data: {
            userId: booking.property.hostId,
            type: NotificationType.BOOKING_CANCELLED,
            title: "KhÃ¡ch Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t",
            message: `KhÃ¡ch Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t ${booking.property.title}.${input.reason ? ` LÃ½ do: ${input.reason.trim()}` : ""}`,
            metadata: { bookingId: booking.id, action: "BOOKING_CANCELLED_BY_GUEST" },
          },
        });
      }

      return { kind: "SUCCESS" as const, data: { id: input.bookingId, status: BookingStatus.CANCELLED_BY_GUEST, cancelledAt: cancelledAt.toISOString() } };
    });
  },

  // â”€â”€ Host: mark no-show â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async markNoShow(input: { hostId: string; bookingId: string }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        select: { id: true, status: true, userId: true, checkIn: true, property: { select: { title: true } } },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== BookingStatus.CONFIRMED) return { kind: "BOOKING_NOT_CONFIRMED" as const };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (!booking.checkIn || booking.checkIn > today) return { kind: "CHECK_IN_NOT_REACHED" as const };

      await tx.booking.update({ where: { id: input.bookingId }, data: { status: BookingStatus.NO_SHOW } });

      await tx.bookingEvent.create({
        data: { bookingId: input.bookingId, actorId: input.hostId, actorRole: "HOST", type: BookingEventType.NO_SHOW, message: "Host Ä‘Ã£ Ä‘Ã¡nh dáº¥u khÃ¡ch khÃ´ng Ä‘áº¿n nháº­n phÃ²ng." },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.BOOKING_NO_SHOW,
          title: "KhÃ´ng Ä‘áº¿n nháº­n phÃ²ng",
          message: `ÄÆ¡n Ä‘áº·t ${booking.property?.title ?? "phÃ²ng"} Ä‘Ã£ Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u lÃ  khÃ´ng Ä‘áº¿n nháº­n phÃ²ng.`,
          metadata: { bookingId: booking.id, action: "BOOKING_NO_SHOW" },
        },
      });

      return { kind: "SUCCESS" as const, data: { id: input.bookingId, status: BookingStatus.NO_SHOW } };
    });
  },

  // â”€â”€ Host: mark completed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async markCompleted(input: { hostId: string; bookingId: string }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        select: { id: true, status: true, userId: true, checkOut: true, property: { select: { title: true } } },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== BookingStatus.CONFIRMED) return { kind: "BOOKING_NOT_CONFIRMED" as const };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (!booking.checkOut || booking.checkOut > today) return { kind: "CHECK_OUT_NOT_REACHED" as const };

      await tx.booking.update({ where: { id: input.bookingId }, data: { status: BookingStatus.COMPLETED } });

      await tx.bookingEvent.create({
        data: { bookingId: input.bookingId, actorId: input.hostId, actorRole: "HOST", type: BookingEventType.COMPLETED, message: "Host Ä‘Ã£ Ä‘Ã¡nh dáº¥u Ä‘Æ¡n Ä‘áº·t hoÃ n táº¥t." },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.BOOKING_COMPLETED,
          title: "ÄÆ¡n Ä‘áº·t hoÃ n táº¥t",
          message: `ÄÆ¡n Ä‘áº·t ${booking.property?.title ?? "phÃ²ng"} Ä‘Ã£ hoÃ n táº¥t. Cáº£m Æ¡n báº¡n Ä‘Ã£ lÆ°u trÃº!`,
          metadata: { bookingId: booking.id, action: "BOOKING_COMPLETED" },
        },
      });

      return { kind: "SUCCESS" as const, data: { id: input.bookingId, status: BookingStatus.COMPLETED } };
    });
  },

  // â”€â”€ Traveler: list own bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async listTravelerBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            id: true, title: true, city: true, country: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        },
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      type: b.type,
      status: b.status,
      paymentStatus: b.paymentStatus,
      checkIn: b.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: b.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: b.numGuests,
      totalPrice: b.totalPrice.toNumber(),
      cancelledAt: b.cancelledAt?.toISOString() ?? null,
      cancelledReason: b.cancelledReason ?? null,
      createdAt: b.createdAt.toISOString(),
      item: b.property
        ? { id: b.property.id, title: b.property.title, city: b.property.city, country: b.property.country, thumbnailUrl: b.property.images[0]?.url ?? null }
        : null,
    }));
  },

  // â”€â”€ Guest: create property booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async createPropertyBooking(input: { userId: string; propertyId: string; checkIn: Date; checkOut: Date; guests: number; ratePlanId?: string | null; promotionCode?: string | null; notes?: string | null }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: input.propertyId, status: ListingStatus.ACTIVE },
        select: { id: true, title: true, pricePerNight: true, cleaningFee: true, maxGuests: true, bookingMethod: true, hostId: true },
      });

      if (!property) return { kind: "PROPERTY_NOT_FOUND" as const };
      if (input.guests > property.maxGuests) return { kind: "GUEST_LIMIT_EXCEEDED" as const };

      const [blockedDates, conflictingBookings] = await Promise.all([
        tx.propertyAvailability.findMany({ where: { propertyId: input.propertyId, date: { gte: input.checkIn, lt: input.checkOut } }, select: { id: true } }),
        tx.booking.findMany({ where: { propertyId: input.propertyId, status: { in: [...SLOT_HOLDING_STATUSES] }, checkIn: { lt: input.checkOut }, checkOut: { gt: input.checkIn } }, select: { id: true } }),
      ]);

      if (blockedDates.length > 0 || conflictingBookings.length > 0) return { kind: "PROPERTY_UNAVAILABLE" as const };

      // Validate rate plan if provided
      let ratePlan: { id: string; priceAdjustmentType: string; priceAdjustmentValue: { toNumber(): number }; minStay: number | null; maxStay: number | null } | null = null;
      if (input.ratePlanId) {
        ratePlan = await tx.propertyRatePlan.findFirst({
          where: { id: input.ratePlanId, propertyId: input.propertyId, isActive: true },
          select: { id: true, priceAdjustmentType: true, priceAdjustmentValue: true, minStay: true, maxStay: true },
        });
        if (!ratePlan) return { kind: "RATE_PLAN_NOT_FOUND" as const };
      }

      // Daily rate validation & pricing
      const [dailyRateRows, checkOutRate] = await Promise.all([
        tx.propertyDailyRate.findMany({
          where: { propertyId: input.propertyId, date: { gte: input.checkIn, lt: input.checkOut } },
          select: { date: true, price: true, minStay: true, maxStay: true, closedToArrival: true },
        }),
        tx.propertyDailyRate.findUnique({
          where: { propertyId_date: { propertyId: input.propertyId, date: input.checkOut } },
          select: { closedToDeparture: true },
        }),
      ]);

      const checkInKey = input.checkIn.toISOString().slice(0, 10);
      const rateMap = new Map(dailyRateRows.map((r) => [r.date.toISOString().slice(0, 10), r]));
      const arrivalRate = rateMap.get(checkInKey);

      if (arrivalRate?.closedToArrival) return { kind: "CLOSED_TO_ARRIVAL" as const };
      if (checkOutRate?.closedToDeparture) return { kind: "CLOSED_TO_DEPARTURE" as const };

      const nights = (input.checkOut.getTime() - input.checkIn.getTime()) / 86_400_000;
      // minStay: take max of daily rate constraint and rate plan constraint
      const effectiveMinStay = Math.max(arrivalRate?.minStay ?? 0, ratePlan?.minStay ?? 0);
      const effectiveMaxStay = ratePlan?.maxStay ?? arrivalRate?.maxStay ?? null;
      if (effectiveMinStay > 0 && nights < effectiveMinStay) return { kind: "MIN_STAY_NOT_MET" as const };
      if (effectiveMaxStay !== null && nights > effectiveMaxStay) return { kind: "MAX_STAY_EXCEEDED" as const };

      const priceMap = new Map<string, number | null>(
        dailyRateRows.map((r) => [r.date.toISOString().slice(0, 10), r.price ? Number(r.price) : null]),
      );

      const pricing = pricingService.calculatePropertyTotal({
        pricePerNight: property.pricePerNight,
        cleaningFee: property.cleaningFee,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        dailyRates: priceMap,
        ratePlan: ratePlan
          ? { priceAdjustmentType: ratePlan.priceAdjustmentType as "NONE" | "PERCENT" | "FIXED", priceAdjustmentValue: ratePlan.priceAdjustmentValue.toNumber() }
          : null,
      });
      const promotionCode = input.promotionCode?.trim().toUpperCase().replace(/\s+/g, "") || null;
      let promotion: { id: string; discountType: string; discountValue: { toNumber(): number }; minOrderValue: { toNumber(): number } | null } | null = null;
      let discountAmount = 0;
      if (promotionCode) {
        const now = new Date();
        const foundPromotion = await tx.promotion.findFirst({
          where: {
            code: promotionCode,
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
            OR: [
              { hostId: null, propertyId: null },
              { hostId: property.hostId, propertyId: null },
              { hostId: property.hostId, propertyId: input.propertyId },
            ],
            redemptions: { none: { userId: input.userId } },
          },
          select: { id: true, discountType: true, discountValue: true, minOrderValue: true, maxUses: true, usedCount: true },
        });

        if (!foundPromotion || (foundPromotion.maxUses !== null && foundPromotion.usedCount >= foundPromotion.maxUses)) {
          return { kind: "PROMOTION_NOT_AVAILABLE" as const };
        }
        if (foundPromotion.minOrderValue && pricing.totalPrice < foundPromotion.minOrderValue.toNumber()) {
          return { kind: "PROMOTION_MIN_ORDER_NOT_MET" as const };
        }
        discountAmount = foundPromotion.discountType === "PERCENTAGE"
          ? Math.round(pricing.totalPrice * (foundPromotion.discountValue.toNumber() / 100))
          : foundPromotion.discountValue.toNumber();
        discountAmount = Math.min(Math.max(0, discountAmount), pricing.totalPrice);
        promotion = foundPromotion;
      }
      const finalTotalPrice = Math.max(0, pricing.totalPrice - discountAmount);
      const isInstant = property.bookingMethod === BookingMethod.INSTANT;
      const expiresAt = isInstant ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const booking = await tx.booking.create({
        data: {
          type: BookingType.PROPERTY,
          userId: input.userId,
          propertyId: input.propertyId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          numGuests: input.guests,
          totalPrice: finalTotalPrice,
          status: isInstant ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          promotionId: promotion?.id ?? null,
          ratePlanId: ratePlan?.id ?? null,
          notes: input.notes?.trim() || null,
          expiresAt,
        },
        select: { id: true, type: true, propertyId: true, checkIn: true, checkOut: true, numGuests: true, totalPrice: true, status: true, paymentStatus: true, expiresAt: true, createdAt: true },
      });

      const confirmedOnCreate = booking.status === BookingStatus.CONFIRMED;

      if (promotion) {
        await tx.promotionRedemption.create({ data: { promotionId: promotion.id, userId: input.userId, bookingId: booking.id } });
        await tx.promotion.update({ where: { id: promotion.id }, data: { usedCount: { increment: 1 } } });
      }

      if (confirmedOnCreate) {
        await tx.payment.create({ data: { bookingId: booking.id, amount: booking.totalPrice, currency: "VND", method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID } });
      }

      const eventData: // biome-ignore lint: prisma json type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[] = [
        { bookingId: booking.id, actorId: input.userId, actorRole: "GUEST", type: BookingEventType.CREATED, message: "ÄÆ¡n Ä‘áº·t Ä‘Æ°á»£c táº¡o." },
      ];
      if (confirmedOnCreate) {
        eventData.push(
          { bookingId: booking.id, actorRole: "SYSTEM", type: BookingEventType.CONFIRMED_AUTO, message: "XÃ¡c nháº­n tá»± Ä‘á»™ng (Ä‘áº·t ngay)." },
          { bookingId: booking.id, actorRole: "SYSTEM", type: BookingEventType.PAYMENT_CREATED, message: "Báº£n ghi thanh toÃ¡n Ä‘Æ°á»£c táº¡o, chá» thu tiá»n." },
        );
      }
      if (promotion) {
        eventData.push({
          bookingId: booking.id,
          actorRole: "SYSTEM",
          type: "PROMOTION_APPLIED",
          message: `MÃ£ Æ°u Ä‘Ã£i ${promotionCode} Ä‘Ã£ Ä‘Æ°á»£c Ã¡p dá»¥ng.`,
          metadata: { promotionId: promotion.id, promotionCode, discountAmount },
        });
      }
      await tx.bookingEvent.createMany({ data: eventData });

      await createSystemMessage(
        tx, booking.id,
        confirmedOnCreate
          ? "Äáº·t phÃ²ng Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n tá»± Ä‘á»™ng. ChÃºc báº¡n cÃ³ chuyáº¿n Ä‘i tuyá»‡t vá»i!"
          : "YÃªu cáº§u Ä‘áº·t phÃ²ng Ä‘Ã£ Ä‘Æ°á»£c gá»­i. Host sáº½ xÃ¡c nháº­n trong 24 giá».",
      );

      await tx.notification.createMany({
        data: [
          {
            userId: property.hostId,
            type: NotificationType.SYSTEM,
            title: confirmedOnCreate ? "CÃ³ booking Ä‘Æ°á»£c xÃ¡c nháº­n tá»± Ä‘á»™ng" : "CÃ³ yÃªu cáº§u Ä‘áº·t phÃ²ng má»›i",
            message: confirmedOnCreate ? `KhÃ¡ch vá»«a Ä‘áº·t ${property.title} vÃ  Ä‘Æ¡n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n tá»± Ä‘á»™ng.` : `KhÃ¡ch vá»«a gá»­i yÃªu cáº§u Ä‘áº·t ${property.title}. Vui lÃ²ng kiá»ƒm tra vÃ  xÃ¡c nháº­n.`,
            metadata: { bookingId: booking.id, propertyId: input.propertyId, action: confirmedOnCreate ? "BOOKING_AUTO_CONFIRMED" : "BOOKING_APPROVAL_REQUESTED" },
          },
          {
            userId: input.userId,
            type: confirmedOnCreate ? NotificationType.BOOKING_CONFIRMED : NotificationType.SYSTEM,
            title: confirmedOnCreate ? "Äáº·t phÃ²ng thÃ nh cÃ´ng" : "ÄÃ£ gá»­i yÃªu cáº§u Ä‘áº·t phÃ²ng",
            message: confirmedOnCreate ? `ÄÆ¡n Ä‘áº·t ${property.title} cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n thÃ nh cÃ´ng.` : `YÃªu cáº§u Ä‘áº·t ${property.title} Ä‘Ã£ Ä‘Æ°á»£c gá»­i tá»›i Host.`,
            metadata: { bookingId: booking.id, propertyId: input.propertyId, action: confirmedOnCreate ? "BOOKING_CONFIRMED" : "BOOKING_PENDING_HOST" },
          },
        ],
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          ...booking,
          totalPrice: booking.totalPrice.toNumber(),
          checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
          checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
          expiresAt: booking.expiresAt?.toISOString() ?? null,
          createdAt: booking.createdAt.toISOString(),
          pricing: { ...pricing, discountAmount, totalPriceBeforePromotion: pricing.totalPrice },
          promotion: promotion ? { id: promotion.id, code: promotionCode, discountAmount } : null,
        },
      };
    });
  },

  // â”€â”€ Admin: update booking status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async updateAdminBookingStatus(input: { bookingId: string; status: "CONFIRMED" | "CANCELLED" }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        select: { id: true, status: true, totalPrice: true, userId: true, type: true, property: { select: { title: true } } },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "PENDING") return { kind: "BOOKING_NOT_PENDING" as const };

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status, ...(input.status === "CONFIRMED" ? { expiresAt: null } : {}) },
        select: { id: true, status: true, updatedAt: true },
      });

      if (input.status === "CONFIRMED") {
        await tx.payment.create({ data: { bookingId: input.bookingId, amount: booking.totalPrice, currency: "VND", method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.UNPAID } });
        await tx.bookingEvent.createMany({
          data: [
            { bookingId: input.bookingId, actorRole: "ADMIN", type: BookingEventType.CONFIRMED, message: "Admin Ä‘Ã£ xÃ¡c nháº­n Ä‘Æ¡n Ä‘áº·t." },
            { bookingId: input.bookingId, actorRole: "SYSTEM", type: BookingEventType.PAYMENT_CREATED, message: "Báº£n ghi thanh toÃ¡n Ä‘Æ°á»£c táº¡o, chá» thu tiá»n." },
          ],
        });
      } else {
        await tx.bookingEvent.create({
          data: { bookingId: input.bookingId, actorRole: "ADMIN", type: BookingEventType.CANCELLED_BY_ADMIN, message: "Admin Ä‘Ã£ há»§y Ä‘Æ¡n Ä‘áº·t." },
        });
      }

      const itemTitle = booking.property?.title ?? "Ä‘Æ¡n Ä‘áº·t phÃ²ng";
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: input.status === "CONFIRMED" ? NotificationType.BOOKING_CONFIRMED : NotificationType.BOOKING_CANCELLED,
          title: input.status === "CONFIRMED" ? "Äáº·t phÃ²ng thÃ nh cÃ´ng" : "Äáº·t phÃ²ng Ä‘Ã£ bá»‹ há»§y",
          message: input.status === "CONFIRMED" ? `ÄÆ¡n Ä‘áº·t ${itemTitle} cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c admin duyá»‡t.` : `ÄÆ¡n Ä‘áº·t ${itemTitle} Ä‘Ã£ bá»‹ admin há»§y.`,
          metadata: { bookingId: booking.id, action: input.status === "CONFIRMED" ? "BOOKING_APPROVED" : "BOOKING_CANCELLED" },
        },
      });

      return { kind: "SUCCESS" as const, data: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() } };
    });
  },
};

