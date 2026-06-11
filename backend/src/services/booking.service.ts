import { BookingType, ListingStatus, PaymentMethod } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { pricingService } from "./pricing.service";

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
        payment: {
          select: { method: true, paidAt: true },
        },
        settlement: {
          select: { status: true, platformFee: true, hostAmount: true, availableAt: true, paidAt: true },
        },
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
      paymentMethod: booking.payment?.method ?? null,
      paidAt: booking.payment?.paidAt?.toISOString() ?? null,
      settlement: booking.settlement
        ? {
            status: booking.settlement.status,
            platformFee: booking.settlement.platformFee.toNumber(),
            hostAmount: booking.settlement.hostAmount.toNumber(),
            availableAt: booking.settlement.availableAt.toISOString(),
            paidAt: booking.settlement.paidAt?.toISOString() ?? null,
          }
        : null,
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
          userId: true,
          paymentStatus: true,
          property: { select: { title: true } },
        },
      });

      if (!booking) {
        return { kind: "BOOKING_NOT_FOUND" as const };
      }

      if (booking.status !== "PENDING") {
        return { kind: "BOOKING_NOT_PENDING" as const };
      }

      const now = new Date();
      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          status: input.status,
          ...(input.status === "CONFIRMED" ? { confirmedAt: now } : { cancelledAt: now }),
          ...(input.status === "CANCELLED" && booking.paymentStatus === "PAID"
            ? { paymentStatus: "REFUNDED" }
            : {}),
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      if (input.status === "CANCELLED" && booking.paymentStatus === "PAID") {
        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: "PAID" },
          data: { status: "REFUNDED" },
        });
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
        payment: {
          select: { method: true, paidAt: true },
        },
        settlement: {
          select: { status: true, platformFee: true, hostAmount: true, availableAt: true, paidAt: true },
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
      paymentMethod: booking.payment?.method ?? null,
      paidAt: booking.payment?.paidAt?.toISOString() ?? null,
      settlement: booking.settlement
        ? {
            status: booking.settlement.status,
            platformFee: booking.settlement.platformFee.toNumber(),
            hostAmount: booking.settlement.hostAmount.toNumber(),
            availableAt: booking.settlement.availableAt.toISOString(),
            paidAt: booking.settlement.paidAt?.toISOString() ?? null,
          }
        : null,
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
        },
      });

      if (!property) {
        return { kind: "PROPERTY_NOT_FOUND" as const };
      }

      if (input.guests > property.maxGuests) {
        return { kind: "GUEST_LIMIT_EXCEEDED" as const };
      }

      const [blockedDates, conflictingBookings] = await Promise.all([
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
          select: { id: true },
        }),
      ]);

      if (blockedDates.length > 0 || conflictingBookings.length > 0) {
        return { kind: "PROPERTY_UNAVAILABLE" as const };
      }

      const pricing = pricingService.calculatePropertyTotal({
        pricePerNight: property.pricePerNight,
        cleaningFee: property.cleaningFee,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      });

      const booking = await tx.booking.create({
        data: {
          type: BookingType.PROPERTY,
          userId: input.userId,
          propertyId: input.propertyId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          numGuests: input.guests,
          totalPrice: pricing.totalPrice,
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

      const admins = await tx.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SYSTEM",
            title: "Có đơn đặt phòng mới",
            message: `Khách vừa đặt ${property.title}. Vui lòng kiểm tra và duyệt đơn.`,
            metadata: {
              bookingId: booking.id,
              propertyId: input.propertyId,
              action: "BOOKING_CREATED",
            },
          })),
        });
      }

      return {
        kind: "SUCCESS" as const,
        data: {
          ...booking,
          totalPrice: booking.totalPrice.toNumber(),
          checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
          checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
          createdAt: booking.createdAt.toISOString(),
          pricing,
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
          userId: true,
          paymentStatus: true,
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

      const now = new Date();
      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          status: input.status,
          ...(input.status === "CONFIRMED" ? { confirmedAt: now } : { cancelledAt: now }),
          ...(input.status === "CANCELLED" && booking.paymentStatus === "PAID"
            ? { paymentStatus: "REFUNDED" }
            : {}),
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      if (input.status === "CANCELLED" && booking.paymentStatus === "PAID") {
        await tx.payment.updateMany({
          where: { bookingId: booking.id, status: "PAID" },
          data: { status: "REFUNDED" },
        });
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

  async recordTravelerPayment(input: {
    userId: string;
    bookingId: string;
    method: PaymentMethod;
    transactionId?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, userId: input.userId },
        include: { payment: true },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
        return { kind: "BOOKING_NOT_PAYABLE" as const };
      }

      if (booking.payment?.status === "PAID") {
        return {
          kind: "SUCCESS" as const,
          data: {
            id: booking.payment.id,
            status: booking.payment.status,
            amount: booking.payment.amount.toNumber(),
            paidAt: booking.payment.paidAt?.toISOString() ?? null,
          },
        };
      }

      const now = new Date();
      const payment = await tx.payment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          amount: booking.totalPrice,
          method: input.method,
          status: "PAID",
          transactionId: input.transactionId?.trim() || null,
          paidAt: now,
        },
        update: {
          amount: booking.totalPrice,
          method: input.method,
          status: "PAID",
          transactionId: input.transactionId?.trim() || null,
          paidAt: now,
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "PAID" },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "PAYMENT_RECEIVED",
          title: "Thanh toán thành công",
          message: `TripNest đã nhận ${booking.totalPrice.toNumber().toLocaleString("vi-VN")} VND cho booking của bạn.`,
          metadata: { bookingId: booking.id, paymentId: payment.id, action: "PAYMENT_CAPTURED" },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount.toNumber(),
          paidAt: payment.paidAt?.toISOString() ?? null,
        },
      };
    });
  },

  async checkInHostBooking(input: { hostId: string; bookingId: string }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        select: { id: true, status: true, paymentStatus: true, userId: true },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "CONFIRMED") return { kind: "INVALID_BOOKING_STATUS" as const };
      if (booking.paymentStatus !== "PAID") return { kind: "PAYMENT_REQUIRED" as const };

      const now = new Date();
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CHECKED_IN", checkedInAt: now },
        select: { id: true, status: true, checkedInAt: true },
      });

      return {
        kind: "SUCCESS" as const,
        data: { id: updated.id, status: updated.status, checkedInAt: updated.checkedInAt?.toISOString() ?? null },
      };
    });
  },

  async checkOutHostBooking(input: { hostId: string; bookingId: string }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, type: "PROPERTY", property: { hostId: input.hostId } },
        include: { property: { select: { id: true, commission: true } }, payment: true, settlement: true },
      });

      if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };
      if (booking.status !== "CHECKED_IN") return { kind: "INVALID_BOOKING_STATUS" as const };
      if (booking.paymentStatus !== "PAID" || booking.payment?.status !== "PAID") {
        return { kind: "PAYMENT_REQUIRED" as const };
      }
      if (!booking.property) return { kind: "BOOKING_NOT_FOUND" as const };

      const now = new Date();
      const releaseBase = booking.checkedInAt ?? now;
      const availableAt = new Date(releaseBase.getTime() + 24 * 60 * 60 * 1000);
      const grossAmount = booking.totalPrice.toNumber();
      const platformFee = Math.round(grossAmount * booking.property.commission.toNumber());
      const hostAmount = grossAmount - platformFee;

      const settlement = await tx.settlement.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          propertyId: booking.property.id,
          grossAmount,
          platformFee,
          hostAmount,
          status: availableAt <= now ? "AVAILABLE" : "PENDING",
          availableAt,
          recognizedAt: now,
        },
        update: {
          grossAmount,
          platformFee,
          hostAmount,
          status: availableAt <= now ? "AVAILABLE" : "PENDING",
          availableAt,
          recognizedAt: now,
        },
      });

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED", completedAt: now },
        select: { id: true, status: true, completedAt: true },
      });

      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: "BOOKING_COMPLETED",
          title: "Chuyến đi đã hoàn thành",
          message: "Booking đã được trả phòng và quyết toán thành công.",
          metadata: { bookingId: booking.id, settlementId: settlement.id, action: "BOOKING_CHECKED_OUT" },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          status: updated.status,
          completedAt: updated.completedAt?.toISOString() ?? null,
          settlement: {
            status: settlement.status,
            grossAmount: settlement.grossAmount.toNumber(),
            platformFee: settlement.platformFee.toNumber(),
            hostAmount: settlement.hostAmount.toNumber(),
            availableAt: settlement.availableAt.toISOString(),
          },
        },
      };
    });
  },

  async getHostFinance(hostId: string) {
    const now = new Date();
    await prisma.settlement.updateMany({
      where: { property: { hostId }, status: "PENDING", availableAt: { lte: now } },
      data: { status: "AVAILABLE" },
    });

    const settlements = await prisma.settlement.findMany({
      where: { property: { hostId } },
      orderBy: { recognizedAt: "desc" },
      include: {
        booking: { select: { id: true, checkIn: true, checkOut: true } },
        property: { select: { id: true, title: true } },
      },
    });

    const sum = (status?: "PENDING" | "AVAILABLE" | "PAID") => settlements
      .filter((item) => !status || item.status === status)
      .reduce((total, item) => total + item.hostAmount.toNumber(), 0);

    return {
      summary: {
        grossRevenue: settlements.reduce((total, item) => total + item.grossAmount.toNumber(), 0),
        platformFees: settlements.reduce((total, item) => total + item.platformFee.toNumber(), 0),
        hostRevenue: sum(),
        pending: sum("PENDING"),
        available: sum("AVAILABLE"),
        paid: sum("PAID"),
      },
      items: settlements.map((item) => ({
        id: item.id,
        bookingId: item.booking.id,
        property: item.property,
        checkIn: item.booking.checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: item.booking.checkOut?.toISOString().slice(0, 10) ?? null,
        grossAmount: item.grossAmount.toNumber(),
        platformFee: item.platformFee.toNumber(),
        hostAmount: item.hostAmount.toNumber(),
        status: item.status,
        availableAt: item.availableAt.toISOString(),
        paidAt: item.paidAt?.toISOString() ?? null,
      })),
    };
  },
};
