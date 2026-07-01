import { BookingStatus, ModificationStatus, NotificationType, PaymentStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { BookingEventType } from "../services/booking.service";
import { ModEventType } from "../services/booking-modification.service";

const LABEL = "[expire-bookings]";
const BATCH_SIZE = 50;

/**
 * Tìm và hết-hạn các booking PENDING quá expiresAt.
 *
 * Idempotent: dùng updateMany với điều kiện status=PENDING để tránh
 * duplicate khi nhiều instance chạy đồng thời hoặc job restart.
 */
export async function expireUnpaidBookings(): Promise<{ checked: number; expired: number }> {
  const now = new Date();

  const candidates = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      expiresAt: { not: null, lt: now },
      paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PENDING_PAYMENT] },
    },
    take: BATCH_SIZE,
    select: {
      id: true,
      userId: true,
      payment: { select: { id: true } },
      property: { select: { hostId: true, title: true } },
    },
  });

  let expired = 0;

  for (const booking of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        // atomic update — nếu process khác đã expire rồi thì count = 0, skip
        const result = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.PENDING,
            expiresAt: { lt: now },
          },
          data: { status: BookingStatus.EXPIRED },
        });

        if (result.count === 0) return;

        if (booking.payment) {
          await tx.payment.update({
            where: { id: booking.payment.id },
            data: { status: PaymentStatus.FAILED, failedAt: now },
          });
        }

        await tx.bookingEvent.create({
          data: {
            bookingId: booking.id,
            actorRole: "SYSTEM",
            type: BookingEventType.EXPIRED,
            message: "Đơn đặt tự động hết hạn vì không được xác nhận trong 24 giờ.",
          },
        });

        const propertyTitle = booking.property?.title ?? "chỗ ở";

        await tx.notification.create({
          data: {
            userId: booking.userId,
            type: NotificationType.BOOKING_EXPIRED,
            title: "Đơn đặt phòng đã hết hạn",
            message: `Đơn đặt ${propertyTitle} của bạn đã hết hạn vì host không phản hồi trong 24 giờ. Bạn có thể đặt lại bất kỳ lúc nào.`,
            metadata: { bookingId: booking.id, action: "BOOKING_EXPIRED_GUEST" },
          },
        });

        if (booking.property?.hostId) {
          await tx.notification.create({
            data: {
              userId: booking.property.hostId,
              type: NotificationType.BOOKING_EXPIRED,
              title: "Yêu cầu đặt phòng hết hạn",
              message: `Một yêu cầu đặt ${propertyTitle} đã hết hạn vì bạn không phản hồi trong 24 giờ.`,
              metadata: { bookingId: booking.id, action: "BOOKING_EXPIRED_HOST" },
            },
          });
        }
      });

      expired++;
    } catch (err) {
      console.error(`${LABEL} Error expiring booking ${booking.id}:`, err);
    }
  }

  if (expired > 0 || candidates.length > 0) {
    console.log(`${LABEL} checked=${candidates.length} expired=${expired}`);
  }

  return { checked: candidates.length, expired };
}

export async function expirePendingModifications(): Promise<{ checked: number; expired: number }> {
  const now = new Date();

  const candidates = await prisma.bookingModification.findMany({
    where: { status: ModificationStatus.PENDING, expiresAt: { lt: now } },
    take: BATCH_SIZE,
    select: {
      id: true,
      bookingId: true,
      requestedBy: true,
      booking: { select: { property: { select: { title: true } } } },
    },
  });

  let expired = 0;

  for (const mod of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        const result = await tx.bookingModification.updateMany({
          where: { id: mod.id, status: ModificationStatus.PENDING },
          data: { status: ModificationStatus.EXPIRED },
        });

        if (result.count === 0) return;

        await tx.bookingEvent.create({
          data: {
            bookingId: mod.bookingId,
            actorRole: "SYSTEM",
            type: ModEventType.MODIFICATION_EXPIRED,
            message: "Yêu cầu thay đổi đặt phòng đã hết hạn sau 24 giờ.",
            metadata: { modificationId: mod.id },
          },
        });

        await tx.notification.create({
          data: {
            userId: mod.requestedBy,
            type: NotificationType.MODIFICATION_RESPONDED,
            title: "Yêu cầu thay đổi hết hạn",
            message: `Yêu cầu thay đổi đặt phòng ${mod.booking.property?.title ?? "của bạn"} đã hết hạn.`,
            metadata: { bookingId: mod.bookingId, modificationId: mod.id, action: "MODIFICATION_EXPIRED" },
          },
        });
      });

      expired++;
    } catch (err) {
      console.error(`${LABEL} Error expiring modification ${mod.id}:`, err);
    }
  }

  if (expired > 0 || candidates.length > 0) {
    console.log(`${LABEL} modifications checked=${candidates.length} expired=${expired}`);
  }

  return { checked: candidates.length, expired };
}

/**
 * Khởi động job với setInterval.
 * Chạy ngay lần đầu để xử lý các booking hết hạn trong lúc server down.
 * Trả về timer để có thể clearInterval khi shutdown.
 */
export function startExpireBookingsJob(intervalMs = 5 * 60 * 1000): ReturnType<typeof setInterval> {
  console.log(`${LABEL} Started — interval ${intervalMs / 1000}s`);

  const runAll = () => Promise.all([
    expireUnpaidBookings(),
    expirePendingModifications(),
  ]);

  runAll().catch((err) => console.error(`${LABEL} Initial run error:`, err));

  return setInterval(() => {
    runAll().catch((err) => console.error(`${LABEL} Interval run error:`, err));
  }, intervalMs);
}
