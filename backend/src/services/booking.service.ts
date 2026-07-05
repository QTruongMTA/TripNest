import { BookingMethod, BookingStatus, BookingType, ListingStatus, PaymentMethod } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { hasPropertyGuestCapacity } from "./availability.service";
import { pricingService } from "./pricing.service";

type PropertyPaymentOption = "PAY_AT_PROPERTY" | "DEPOSIT_30" | "PAY_FULL";

function getPaymentDetails(option: PropertyPaymentOption | undefined, totalPrice: number) {
  if (option === "DEPOSIT_30") {
    return {
      method: PaymentMethod.BANK_TRANSFER,
      amount: Math.round(totalPrice * 0.3),
      option: "DEPOSIT_30" as const,
    };
  }

  if (option === "PAY_FULL") {
    return {
      method: PaymentMethod.BANK_TRANSFER,
      amount: totalPrice,
      option: "PAY_FULL" as const,
    };
  }

  return {
    method: PaymentMethod.CASH,
    amount: totalPrice,
    option: "PAY_AT_PROPERTY" as const,
  };
}

export const bookingService = {
  async listHostBookings(hostId: string) {
    const bookings = await prisma.booking.findMany({
      where: {
        type: "PROPERTY",
        property: {
          hostId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      guest: booking.user,
      property: booking.property
        ? {
            ...booking.property,
            thumbnailUrl: booking.property.images[0]?.url ?? null,
          }
        : null,
    }));
  },

  async updateHostPropertyBookingStatus(input: {
    hostId: string;
    bookingId: string;
    status: "CONFIRMED" | "CANCELLED";
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          type: "PROPERTY",
          property: {
            hostId: input.hostId,
          },
        },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          userId: true,
          property: { select: { title: true } },
        },
      });

      if (!booking) {
        return { kind: "BOOKING_NOT_FOUND" as const };
      }

      if (booking.status !== "PENDING") {
        return { kind: "BOOKING_NOT_PENDING" as const };
      }

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      if (input.status === "CONFIRMED") {
        const existingPayment = await tx.payment.findUnique({ where: { bookingId: input.bookingId }, select: { id: true } });
        if (!existingPayment) {
          await tx.payment.create({
            data: {
              bookingId: input.bookingId,
              amount: booking.totalPrice,
              currency: "VND",
              method: PaymentMethod.BANK_TRANSFER,
              status: "UNPAID",
            },
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: input.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED",
          title: input.status === "CONFIRMED" ? "Đặt phòng thành công" : "Đặt phòng đã bị hủy",
          message:
            input.status === "CONFIRMED"
              ? `Đơn đặt ${booking.property?.title ?? "phòng"} của bạn đã được duyệt thành công.`
              : `Đơn đặt ${booking.property?.title ?? "phòng"} của bạn đã bị hủy.`,
          metadata: {
            bookingId: booking.id,
            action: input.status === "CONFIRMED" ? "BOOKING_APPROVED" : "BOOKING_CANCELLED",
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    });
  },

  async listTravelerBookings(userId: string) {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      type: booking.type,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      tourDate: booking.tourDate?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      createdAt: booking.createdAt.toISOString(),
      item:
        booking.type === "PROPERTY" && booking.property
          ? {
              id: booking.property.id,
              title: booking.property.title,
              city: booking.property.city,
              country: booking.property.country,
              thumbnailUrl: booking.property.images[0]?.url ?? null,
            }
          : booking.type === "TOUR" && booking.tour
            ? {
                id: booking.tour.id,
                title: booking.tour.title,
                city: booking.tour.city,
                country: booking.tour.country,
                thumbnailUrl: booking.tour.images[0]?.url ?? null,
              }
            : null,
    }));
  },

  async createPropertyBooking(input: {
    userId: string;
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    notes?: string | null;
    paymentOption?: PropertyPaymentOption;
  }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: {
          id: input.propertyId,
          status: ListingStatus.ACTIVE,
        },
        select: {
          id: true,
          title: true,
          pricePerNight: true,
          cleaningFee: true,
          maxGuests: true,
          bookingMethod: true,
          hostId: true,
        },
      });

      if (!property) {
        return { kind: "PROPERTY_NOT_FOUND" as const };
      }

      if (input.guests > property.maxGuests) {
        return { kind: "GUEST_LIMIT_EXCEEDED" as const };
      }

      const [blockedDates, conflictingBookings, dailyRates] = await Promise.all([
        tx.propertyAvailability.findMany({
          where: {
            propertyId: input.propertyId,
            date: {
              gte: input.checkIn,
              lt: input.checkOut,
            },
          },
          select: { id: true },
        }),
        tx.booking.findMany({
          where: {
            propertyId: input.propertyId,
            status: { in: ["PENDING", "CONFIRMED"] },
            checkIn: { lt: input.checkOut },
            checkOut: { gt: input.checkIn },
          },
          select: { id: true, checkIn: true, checkOut: true, numGuests: true },
        }),
        tx.$queryRaw<Array<{ date: Date; pricePerNight: string }>>`
          SELECT "date", "price" AS "pricePerNight"
          FROM "PropertyDailyRate"
          WHERE "propertyId" = ${input.propertyId}
            AND "date" >= ${input.checkIn}
            AND "date" < ${input.checkOut}
          ORDER BY "date" ASC
        `,
      ]);

      const hasCapacity = hasPropertyGuestCapacity({
        maxGuests: property.maxGuests,
        requestedGuests: input.guests,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        bookings: conflictingBookings,
      });

      if (blockedDates.length > 0 || !hasCapacity) {
        return { kind: "PROPERTY_UNAVAILABLE" as const };
      }

      const pricing = pricingService.calculatePropertyTotal({
        pricePerNight: property.pricePerNight,
        cleaningFee: property.cleaningFee,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        dailyRates,
      });
      const paymentDetails = getPaymentDetails(input.paymentOption, pricing.totalPrice);

      const booking = await tx.booking.create({
        data: {
          type: BookingType.PROPERTY,
          userId: input.userId,
          propertyId: input.propertyId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          numGuests: input.guests,
          totalPrice: pricing.totalPrice,
          status: property.bookingMethod === BookingMethod.INSTANT
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING,
          notes: input.notes?.trim() || null,
        },
        select: {
          id: true,
          type: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          numGuests: true,
          totalPrice: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      });

      const isInstant = booking.status === BookingStatus.CONFIRMED;

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: paymentDetails.amount,
          currency: "VND",
          method: paymentDetails.method,
          status: "UNPAID",
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: property.hostId,
            type: "SYSTEM",
            title: isInstant ? "Có booking được xác nhận tự động" : "Có yêu cầu đặt phòng mới",
            message: isInstant
              ? `Khách vừa đặt ${property.title} và đơn đã được xác nhận tự động.`
              : `Khách vừa gửi yêu cầu đặt ${property.title}. Vui lòng kiểm tra và xác nhận.`,
            metadata: {
              bookingId: booking.id,
              propertyId: input.propertyId,
              action: isInstant ? "BOOKING_AUTO_CONFIRMED" : "BOOKING_APPROVAL_REQUESTED",
            },
          },
          {
            userId: input.userId,
            type: isInstant ? "BOOKING_CONFIRMED" : "SYSTEM",
            title: isInstant ? "Đặt phòng thành công" : "Đã gửi yêu cầu đặt phòng",
            message: isInstant
              ? `Đơn đặt ${property.title} của bạn đã được xác nhận thành công.`
              : `Yêu cầu đặt ${property.title} đã được gửi tới Host để xác nhận.`,
            metadata: {
              bookingId: booking.id,
              propertyId: input.propertyId,
              action: isInstant ? "BOOKING_CONFIRMED" : "BOOKING_PENDING_HOST",
            },
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
          createdAt: booking.createdAt.toISOString(),
          pricing,
          payment: {
            option: paymentDetails.option,
            method: paymentDetails.method,
            amount: paymentDetails.amount,
            status: booking.paymentStatus,
          },
        },
      };
    });
  },

  async updateAdminBookingStatus(input: {
    bookingId: string;
    status: "CONFIRMED" | "CANCELLED";
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          userId: true,
          type: true,
          property: { select: { title: true } },
          tour: { select: { title: true } },
        },
      });

      if (!booking) {
        return { kind: "BOOKING_NOT_FOUND" as const };
      }

      if (booking.status !== "PENDING") {
        return { kind: "BOOKING_NOT_PENDING" as const };
      }

      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: input.status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      if (input.status === "CONFIRMED") {
        const existingPayment = await tx.payment.findUnique({ where: { bookingId: input.bookingId }, select: { id: true } });
        if (!existingPayment) {
          await tx.payment.create({
            data: {
              bookingId: input.bookingId,
              amount: booking.totalPrice,
              currency: "VND",
              method: PaymentMethod.BANK_TRANSFER,
              status: "UNPAID",
            },
          });
        }
      }

      const itemTitle = booking.property?.title ?? booking.tour?.title ?? "đơn đặt phòng";
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: input.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED",
          title: input.status === "CONFIRMED" ? "Đặt phòng thành công" : "Đặt phòng đã bị hủy",
          message:
            input.status === "CONFIRMED"
              ? `Đơn đặt ${itemTitle} của bạn đã được admin duyệt thành công.`
              : `Đơn đặt ${itemTitle} của bạn đã bị admin hủy.`,
          metadata: {
            bookingId: booking.id,
            action: input.status === "CONFIRMED" ? "BOOKING_APPROVED" : "BOOKING_CANCELLED",
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    });
  },
};
