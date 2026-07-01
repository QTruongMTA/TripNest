import { BookingStatus, NotificationType, PaymentStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { createSystemMessage } from "./booking-message.service";

const PaymentEventType = {
  PAYMENT_PENDING_VERIFICATION: "PAYMENT_PENDING_VERIFICATION",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
} as const;

export const paymentService = {

  // ── Guest: report bank transfer done ─────────────────────────────────────
  async markTransferred(bookingId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId },
        select: {
          id: true, status: true, userId: true,
          payment: { select: { id: true, status: true } },
          property: { select: { hostId: true, title: true } },
        },
      });

      if (!booking) return { kind: "NOT_FOUND" as const };
      if (booking.status !== BookingStatus.CONFIRMED) return { kind: "NOT_CONFIRMED" as const };
      if (!booking.payment) return { kind: "NO_PAYMENT" as const };
      if (booking.payment.status !== PaymentStatus.UNPAID) return { kind: "INVALID_STATUS" as const };

      const transferReference = `TN${bookingId.slice(-8).toUpperCase()}`;
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.PENDING_PAYMENT, transferReference },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: PaymentStatus.PENDING_PAYMENT },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId,
          actorId: userId,
          actorRole: "GUEST",
          type: PaymentEventType.PAYMENT_PENDING_VERIFICATION,
          message: "Khách báo đã chuyển khoản, đang chờ xác nhận.",
        },
      });

      await createSystemMessage(
        tx, bookingId,
        "Bạn đã báo đã chuyển khoản. Vui lòng chờ host xác nhận đã nhận tiền.",
      );

      if (booking.property?.hostId) {
        await tx.notification.create({
          data: {
            userId: booking.property.hostId,
            type: NotificationType.SYSTEM,
            title: "Khách báo đã chuyển khoản",
            message: `Khách đặt "${booking.property.title}" đã báo chuyển khoản. Vui lòng kiểm tra tài khoản và xác nhận.`,
            metadata: { bookingId, action: "PAYMENT_PENDING_VERIFICATION" },
          },
        });
      }

      return { kind: "SUCCESS" as const };
    });
  },

  // ── Host: confirm payment received ────────────────────────────────────────
  async confirmByHost(bookingId: string, hostId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, type: "PROPERTY", property: { hostId } },
        select: {
          id: true, userId: true,
          payment: { select: { id: true, status: true } },
        },
      });

      if (!booking) return { kind: "NOT_FOUND" as const };
      if (!booking.payment) return { kind: "NO_PAYMENT" as const };
      if (booking.payment.status !== PaymentStatus.PENDING_PAYMENT) return { kind: "INVALID_STATUS" as const };

      const now = new Date();

      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.PAID, paidAt: now },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: PaymentStatus.PAID },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId,
          actorId: hostId,
          actorRole: "HOST",
          type: PaymentEventType.PAYMENT_CONFIRMED,
          message: "Host đã xác nhận nhận được thanh toán.",
        },
      });

      await createSystemMessage(tx, bookingId, "Thanh toán đã được xác nhận. Đặt phòng của bạn đã hoàn tất thanh toán.");

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.SYSTEM,
          title: "Thanh toán được xác nhận",
          message: "Host đã xác nhận nhận được thanh toán. Đặt phòng của bạn đã được thanh toán đầy đủ.",
          metadata: { bookingId, action: "PAYMENT_CONFIRMED" },
        },
      });

      return { kind: "SUCCESS" as const };
    });
  },

  // ── Admin: confirm payment received ───────────────────────────────────────
  async confirmByAdmin(paymentId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, bookingId: true, status: true },
      });

      if (!payment) return { kind: "NOT_FOUND" as const };
      const confirmable: string[] = [PaymentStatus.PENDING_PAYMENT, PaymentStatus.UNPAID];
      if (!confirmable.includes(payment.status)) return { kind: "INVALID_STATUS" as const };

      const now = new Date();

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PAID, paidAt: now },
      });

      const booking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: PaymentStatus.PAID },
        select: { id: true, userId: true, property: { select: { title: true } } },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          actorId: adminId,
          actorRole: "ADMIN",
          type: PaymentEventType.PAYMENT_CONFIRMED,
          message: "Admin đã xác nhận nhận được thanh toán.",
        },
      });

      await createSystemMessage(tx, payment.bookingId, "Thanh toán đã được admin xác nhận. Đặt phòng của bạn đã hoàn tất thanh toán.");

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: NotificationType.SYSTEM,
          title: "Thanh toán được xác nhận",
          message: `Thanh toán đặt "${booking.property?.title ?? "phòng"}" đã được xác nhận.`,
          metadata: { bookingId: payment.bookingId, paymentId, action: "PAYMENT_CONFIRMED" },
        },
      });

      return { kind: "SUCCESS" as const };
    });
  },
};
