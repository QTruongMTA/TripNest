import { BookingStatus, ModificationStatus, NotificationType, PaymentStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { createSystemMessage } from "./booking-message.service";
import { pricingService } from "./pricing.service";

const SLOT_HOLDING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED] as const;

export const ModEventType = {
  MODIFICATION_REQUESTED: "MODIFICATION_REQUESTED",
  MODIFICATION_APPROVED:  "MODIFICATION_APPROVED",
  MODIFICATION_REJECTED:  "MODIFICATION_REJECTED",
  MODIFICATION_EXPIRED:   "MODIFICATION_EXPIRED",
  MODIFICATION_CANCELLED: "MODIFICATION_CANCELLED",
} as const;

export type BookingModificationPublic = {
  id: string;
  bookingId: string;
  requestedBy: string;
  requesterRole: string;
  status: string;
  newCheckIn: string | null;
  newCheckOut: string | null;
  newNumGuests: number | null;
  oldCheckIn: string | null;
  oldCheckOut: string | null;
  oldNumGuests: number;
  oldTotalPrice: number;
  newTotalPrice: number;
  priceDelta: number;
  expiresAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

function serializeMod(m: {
  id: string; bookingId: string; requestedBy: string; requesterRole: string; status: string;
  newCheckIn: Date | null; newCheckOut: Date | null; newNumGuests: number | null;
  oldCheckIn: Date | null; oldCheckOut: Date | null; oldNumGuests: number;
  oldTotalPrice: { toNumber(): number }; newTotalPrice: { toNumber(): number }; priceDelta: { toNumber(): number };
  expiresAt: Date; respondedAt: Date | null; respondedBy: string | null; rejectionReason: string | null;
  createdAt: Date;
}): BookingModificationPublic {
  return {
    id: m.id,
    bookingId: m.bookingId,
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
  };
}

export const bookingModificationService = {

  // ── Request a modification ──────────────────────────────────────────────────
  async requestModification(input: {
    bookingId: string;
    requestedBy: string;
    requesterRole: "GUEST" | "HOST";
    newCheckIn?: string | null;   // "YYYY-MM-DD"
    newCheckOut?: string | null;
    newNumGuests?: number | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          ...(input.requesterRole === "GUEST"
            ? { userId: input.requestedBy }
            : { type: "PROPERTY", property: { hostId: input.requestedBy } }),
        },
        select: {
          id: true, status: true, checkIn: true, checkOut: true, numGuests: true, totalPrice: true,
          userId: true, propertyId: true,
          property: { select: { id: true, hostId: true, title: true, pricePerNight: true, cleaningFee: true, maxGuests: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== BookingStatus.CONFIRMED) return { kind: "BOOKING_NOT_MODIFIABLE" as const };
      if (!booking.property) return { kind: "BOOKING_NOT_MODIFIABLE" as const };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (booking.checkIn && booking.checkIn <= today) return { kind: "CHECKIN_PASSED" as const };

      // Only one pending modification at a time
      const existingPending = await tx.bookingModification.findFirst({
        where: { bookingId: input.bookingId, status: ModificationStatus.PENDING },
        select: { id: true },
      });
      if (existingPending) return { kind: "DUPLICATE_PENDING" as const };

      // Resolve effective proposed values
      const newCheckIn  = input.newCheckIn  ? new Date(input.newCheckIn)  : booking.checkIn;
      const newCheckOut = input.newCheckOut ? new Date(input.newCheckOut) : booking.checkOut;
      const newNumGuests = input.newNumGuests ?? booking.numGuests;

      // Detect actual changes
      const checkInChanged  = input.newCheckIn  != null && input.newCheckIn  !== booking.checkIn?.toISOString().slice(0, 10);
      const checkOutChanged = input.newCheckOut != null && input.newCheckOut !== booking.checkOut?.toISOString().slice(0, 10);
      const guestsChanged   = input.newNumGuests != null && input.newNumGuests !== booking.numGuests;
      if (!checkInChanged && !checkOutChanged && !guestsChanged) return { kind: "NO_CHANGES" as const };

      if (!newCheckIn || !newCheckOut) return { kind: "BOOKING_NOT_MODIFIABLE" as const };
      if (newCheckIn >= newCheckOut) return { kind: "INVALID_DATE_RANGE" as const };
      if (newCheckIn < today) return { kind: "CHECKIN_PASSED" as const };
      if (newNumGuests > booking.property.maxGuests) return { kind: "GUEST_LIMIT_EXCEEDED" as const };

      // Pre-flight availability check when dates change
      if (checkInChanged || checkOutChanged) {
        const [blocked, conflicts] = await Promise.all([
          tx.propertyAvailability.findMany({
            where: { propertyId: booking.propertyId!, date: { gte: newCheckIn, lt: newCheckOut } },
            select: { id: true },
          }),
          tx.booking.findMany({
            where: {
              propertyId: booking.propertyId!,
              id: { not: input.bookingId },
              status: { in: [...SLOT_HOLDING_STATUSES] },
              checkIn: { lt: newCheckOut },
              checkOut: { gt: newCheckIn },
            },
            select: { id: true },
          }),
        ]);
        if (blocked.length > 0 || conflicts.length > 0) return { kind: "PROPERTY_UNAVAILABLE" as const };
      }

      // Calculate new price
      const newPricing = pricingService.calculatePropertyTotal({
        pricePerNight: booking.property.pricePerNight,
        cleaningFee: booking.property.cleaningFee,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
      });
      const oldTotal = booking.totalPrice.toNumber();
      const newTotal = newPricing.totalPrice;
      const priceDelta = newTotal - oldTotal;

      const mod = await tx.bookingModification.create({
        data: {
          bookingId: input.bookingId,
          requestedBy: input.requestedBy,
          requesterRole: input.requesterRole,
          newCheckIn: checkInChanged ? newCheckIn : null,
          newCheckOut: checkOutChanged ? newCheckOut : null,
          newNumGuests: guestsChanged ? newNumGuests : null,
          oldCheckIn: booking.checkIn,
          oldCheckOut: booking.checkOut,
          oldNumGuests: booking.numGuests,
          oldTotalPrice: oldTotal,
          newTotalPrice: newTotal,
          priceDelta,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: input.bookingId,
          actorId: input.requestedBy,
          actorRole: input.requesterRole,
          type: ModEventType.MODIFICATION_REQUESTED,
          message: `${input.requesterRole === "GUEST" ? "Khách" : "Host"} yêu cầu thay đổi đặt phòng.`,
          metadata: { modificationId: mod.id, priceDelta },
        },
      });

      await createSystemMessage(
        tx, input.bookingId,
        `${input.requesterRole === "GUEST" ? "Khách" : "Host"} đã gửi yêu cầu thay đổi đặt phòng. Vui lòng phản hồi trong 24 giờ.`,
      );

      const notifyUserId = input.requesterRole === "GUEST" ? booking.property.hostId : booking.userId;
      await tx.notification.create({
        data: {
          userId: notifyUserId,
          type: NotificationType.MODIFICATION_REQUESTED,
          title: "Yêu cầu thay đổi đặt phòng",
          message: `${input.requesterRole === "GUEST" ? "Khách" : "Host"} đã yêu cầu thay đổi đặt phòng ${booking.property.title}.`,
          metadata: { bookingId: input.bookingId, modificationId: mod.id },
        },
      });

      return { kind: "SUCCESS" as const, data: serializeMod(mod) };
    });
  },

  // ── Respond to a modification request ──────────────────────────────────────
  async respondToModification(input: {
    bookingId: string;
    modificationId: string;
    responderId: string;
    responderRole: "GUEST" | "HOST";
    decision: "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const mod = await tx.bookingModification.findFirst({
        where: { id: input.modificationId, bookingId: input.bookingId },
      });

      if (!mod) return { kind: "MODIFICATION_NOT_FOUND" as const };
      if (mod.status !== ModificationStatus.PENDING) return { kind: "MODIFICATION_NOT_PENDING" as const };

      // Cannot respond to own request
      if (mod.requestedBy === input.responderId) return { kind: "FORBIDDEN" as const };
      if (mod.requesterRole === input.responderRole) return { kind: "FORBIDDEN" as const };

      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          ...(input.responderRole === "HOST"
            ? { property: { hostId: input.responderId } }
            : { userId: input.responderId }),
        },
        select: {
          id: true, userId: true, propertyId: true,
          checkIn: true, checkOut: true, numGuests: true, totalPrice: true,
          property: { select: { hostId: true, title: true } },
          payment: { select: { id: true, status: true, amount: true, refundAmount: true } },
        },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };

      const now = new Date();

      if (input.decision === "REJECTED") {
        await tx.bookingModification.update({
          where: { id: mod.id },
          data: { status: ModificationStatus.REJECTED, respondedAt: now, respondedBy: input.responderId, rejectionReason: input.rejectionReason?.trim() || null },
        });

        await tx.bookingEvent.create({
          data: {
            bookingId: input.bookingId,
            actorId: input.responderId,
            actorRole: input.responderRole,
            type: ModEventType.MODIFICATION_REJECTED,
            message: `${input.responderRole === "HOST" ? "Host" : "Khách"} đã từ chối yêu cầu thay đổi.${input.rejectionReason ? ` Lý do: ${input.rejectionReason.trim()}` : ""}`,
            metadata: { modificationId: mod.id },
          },
        });

        await createSystemMessage(
          tx, input.bookingId,
          `Yêu cầu thay đổi đặt phòng đã bị từ chối.${input.rejectionReason ? ` Lý do: ${input.rejectionReason.trim()}` : ""}`,
        );

        await tx.notification.create({
          data: {
            userId: mod.requestedBy,
            type: NotificationType.MODIFICATION_RESPONDED,
            title: "Yêu cầu thay đổi bị từ chối",
            message: `Yêu cầu thay đổi đặt phòng ${booking.property?.title ?? ""} đã bị từ chối.${input.rejectionReason ? ` Lý do: ${input.rejectionReason.trim()}` : ""}`,
            metadata: { bookingId: input.bookingId, modificationId: mod.id, action: "REJECTED" },
          },
        });

        return { kind: "SUCCESS" as const, decision: "REJECTED" as const, data: { id: mod.id } };
      }

      // APPROVE — re-check availability if dates change
      const effectiveCheckIn  = mod.newCheckIn  ?? booking.checkIn;
      const effectiveCheckOut = mod.newCheckOut ?? booking.checkOut;

      if (mod.newCheckIn || mod.newCheckOut) {
        if (!effectiveCheckIn || !effectiveCheckOut) return { kind: "BOOKING_NOT_FOUND" as const };

        const [blocked, conflicts] = await Promise.all([
          tx.propertyAvailability.findMany({
            where: { propertyId: booking.propertyId!, date: { gte: effectiveCheckIn, lt: effectiveCheckOut } },
            select: { id: true },
          }),
          tx.booking.findMany({
            where: {
              propertyId: booking.propertyId!,
              id: { not: input.bookingId },
              status: { in: [...SLOT_HOLDING_STATUSES] },
              checkIn: { lt: effectiveCheckOut },
              checkOut: { gt: effectiveCheckIn },
            },
            select: { id: true },
          }),
        ]);
        if (blocked.length > 0 || conflicts.length > 0) return { kind: "PROPERTY_UNAVAILABLE" as const };
      }

      // Mark modification approved
      await tx.bookingModification.update({
        where: { id: mod.id },
        data: { status: ModificationStatus.APPROVED, respondedAt: now, respondedBy: input.responderId },
      });

      // Update booking fields
      await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          ...(mod.newCheckIn  ? { checkIn: mod.newCheckIn }   : {}),
          ...(mod.newCheckOut ? { checkOut: mod.newCheckOut } : {}),
          ...(mod.newNumGuests != null ? { numGuests: mod.newNumGuests } : {}),
          totalPrice: mod.newTotalPrice,
        },
      });

      // Payment reconciliation
      const delta = mod.priceDelta.toNumber();
      if (booking.payment && delta !== 0) {
        const pStatus = booking.payment.status;

        if (pStatus === PaymentStatus.UNPAID || pStatus === PaymentStatus.PENDING_PAYMENT || pStatus === PaymentStatus.PARTIALLY_REFUNDED) {
          // No money moved yet (or partial refund in progress) — just adjust the target amount
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: { amount: mod.newTotalPrice },
          });
        } else if (pStatus === PaymentStatus.PAID) {
          if (delta > 0) {
            await tx.payment.update({ where: { id: booking.payment.id }, data: { status: PaymentStatus.PENDING_PAYMENT } });
            await tx.booking.update({ where: { id: input.bookingId }, data: { paymentStatus: PaymentStatus.PENDING_PAYMENT } });
          } else {
            const existingRefund = booking.payment.refundAmount?.toNumber() ?? 0;
            await tx.payment.update({
              where: { id: booking.payment.id },
              data: { refundAmount: existingRefund + Math.abs(delta), status: PaymentStatus.PARTIALLY_REFUNDED, refundedAt: new Date() },
            });
            await tx.booking.update({ where: { id: input.bookingId }, data: { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED } });
          }
        }
      }

      // Build change summary for event
      const changeParts: string[] = [];
      if (mod.newCheckIn)   changeParts.push(`nhận phòng: ${mod.newCheckIn.toISOString().slice(0, 10)}`);
      if (mod.newCheckOut)  changeParts.push(`trả phòng: ${mod.newCheckOut.toISOString().slice(0, 10)}`);
      if (mod.newNumGuests != null) changeParts.push(`số khách: ${mod.newNumGuests}`);
      const deltaStr = delta > 0
        ? `Khách cần thanh toán thêm ${delta.toLocaleString("vi-VN")} ₫.`
        : delta < 0
          ? `Hoàn lại ${Math.abs(delta).toLocaleString("vi-VN")} ₫.`
          : "Giá không đổi.";

      await tx.bookingEvent.create({
        data: {
          bookingId: input.bookingId,
          actorId: input.responderId,
          actorRole: input.responderRole,
          type: ModEventType.MODIFICATION_APPROVED,
          message: `Thay đổi được chấp nhận: ${changeParts.join(", ")}. ${deltaStr}`,
          metadata: { modificationId: mod.id, priceDelta: delta },
        },
      });

      await createSystemMessage(
        tx, input.bookingId,
        `Yêu cầu thay đổi đặt phòng đã được chấp nhận: ${changeParts.join(", ")}. ${deltaStr}`,
      );

      await tx.notification.create({
        data: {
          userId: mod.requestedBy,
          type: NotificationType.MODIFICATION_RESPONDED,
          title: "Yêu cầu thay đổi được chấp nhận",
          message: `Yêu cầu thay đổi đặt phòng ${booking.property?.title ?? ""} đã được chấp nhận.`,
          metadata: { bookingId: input.bookingId, modificationId: mod.id, action: "APPROVED" },
        },
      });

      return { kind: "SUCCESS" as const, decision: "APPROVED" as const, data: { id: mod.id } };
    });
  },

  // ── Cancel own pending modification ────────────────────────────────────────
  async cancelModification(input: { modificationId: string; requestedBy: string }) {
    return prisma.$transaction(async (tx) => {
      const mod = await tx.bookingModification.findFirst({
        where: { id: input.modificationId, requestedBy: input.requestedBy, status: ModificationStatus.PENDING },
        select: { id: true, bookingId: true, requesterRole: true },
      });

      if (!mod) return { kind: "MODIFICATION_NOT_FOUND" as const };

      await tx.bookingModification.update({
        where: { id: mod.id },
        data: { status: ModificationStatus.CANCELLED },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: mod.bookingId,
          actorId: input.requestedBy,
          actorRole: mod.requesterRole,
          type: ModEventType.MODIFICATION_CANCELLED,
          message: "Yêu cầu thay đổi đã được hủy bởi người yêu cầu.",
          metadata: { modificationId: mod.id },
        },
      });

      return { kind: "SUCCESS" as const };
    });
  },

  // ── List modifications for a booking (caller must own the booking) ─────────
  async listForBooking(bookingId: string, viewerId: string): Promise<BookingModificationPublic[]> {
    // Verify ownership before exposing any modification history
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: viewerId },
      select: { id: true },
    });
    if (!booking) return [];

    const mods = await prisma.bookingModification.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
    return mods.map(serializeMod);
  },
};
