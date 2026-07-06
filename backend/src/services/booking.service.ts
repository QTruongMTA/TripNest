import { BookingMethod, BookingStatus, BookingType, ListingStatus, PaymentMethod } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { validateVoucher } from "../utils/voucher.utils";
import { hasPropertyGuestCapacity } from "./availability.service";
import { pricingService } from "./pricing.service";

type PropertyPaymentOption = "PAY_AT_PROPERTY" | "DEPOSIT_30" | "PAY_FULL";
const travelerCancelReasonPrefix = "[Ly do khach huy]";

function splitCancellationNotes(notes: string | null) {
  if (!notes) return { notes: null, cancellationReason: null };

  const index = notes.indexOf(travelerCancelReasonPrefix);
  if (index === -1) return { notes, cancellationReason: null };

  const visibleNotes = notes.slice(0, index).trim();
  const cancellationReason = notes.slice(index + travelerCancelReasonPrefix.length).trim();

  return {
    notes: visibleNotes || null,
    cancellationReason: cancellationReason || null,
  };
}

function buildCancellationNotes(notes: string | null, reason: string) {
  const existing = splitCancellationNotes(notes).notes;
  const cancellationNote = `${travelerCancelReasonPrefix} ${reason.trim()}`;
  return existing ? `${existing}\n\n${cancellationNote}` : cancellationNote;
}

function inferTravelerDisputeMeta(reason: string) {
  const normalized = reason.toLowerCase();
  if (/(sai|khác|khong dung|không đúng|hình|ảnh|mô tả|mo ta)/i.test(normalized)) {
    return { category: "PROPERTY_MISMATCH", severity: "HIGH" };
  }
  if (/(không nhận|khong nhan|từ chối|tu choi|không vào|khong vao)/i.test(normalized)) {
    return { category: "CHECKIN_BLOCKED", severity: "CRITICAL" };
  }
  if (/(hoàn tiền|hoan tien|refund|tiền|thanh toán|cọc)/i.test(normalized)) {
    return { category: "REFUND_PAYMENT", severity: "HIGH" };
  }
  return { category: "TRAVELER_REPORT", severity: "MEDIUM" };
}

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

function getCancellationFinancials(booking: {
  checkIn: Date | null;
  totalPrice: { toNumber(): number };
  payment: { method: PaymentMethod; amount: { toNumber(): number } } | null;
}) {
  const totalPrice = booking.totalPrice.toNumber();
  const paidAmount = booking.payment?.method === PaymentMethod.BANK_TRANSFER ? booking.payment.amount.toNumber() : 0;

  if (!booking.payment || booking.payment.method !== PaymentMethod.BANK_TRANSFER || paidAmount <= 0) {
    return {
      paymentOption: "PAY_AT_PROPERTY" as const,
      paidAmount: 0,
      refundAmount: 0,
      penaltyAmount: 0,
      isFreeCancellation: true,
    };
  }

  const paymentOption = paidAmount < totalPrice ? "DEPOSIT_30" as const : "PAY_FULL" as const;
  const cutoffHours = paymentOption === "DEPOSIT_30" ? 72 : 24;
  const checkInTime = booking.checkIn?.getTime() ?? 0;
  const hoursBeforeCheckIn = (checkInTime - Date.now()) / 3600000;
  const isFreeCancellation = hoursBeforeCheckIn >= cutoffHours;
  const penaltyAmount = isFreeCancellation ? 0 : paidAmount;
  const refundAmount = isFreeCancellation ? paidAmount : 0;

  return {
    paymentOption,
    paidAmount,
    refundAmount,
    penaltyAmount,
    isFreeCancellation,
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

    return bookings.map((booking) => {
      const noteDetails = splitCancellationNotes(booking.notes);

      return ({
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      notes: noteDetails.notes,
      cancellationReason: noteDetails.cancellationReason,
      createdAt: booking.createdAt.toISOString(),
      guest: booking.user,
      property: booking.property
        ? {
            ...booking.property,
            thumbnailUrl: booking.property.images[0]?.url ?? null,
          }
        : null,
      });
    });
  },

  async getHostRevenue(hostId: string) {
    const bookings = await prisma.booking.findMany({
      where: {
        type: "PROPERTY",
        property: { hostId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            commission: true,
            city: true,
          },
        },
        user: { select: { email: true } },
        payment: { select: { method: true, amount: true, status: true } },
      },
    });

    const disputes = await prisma.dispute.findMany({
      where: {
        bookingId: { in: bookings.map((booking) => booking.id) },
        status: { in: ["OPEN", "INVESTIGATING", "ESCALATED"] },
      },
      select: { bookingId: true, status: true },
    });
    const disputedBookingIds = new Set(disputes.map((dispute) => dispute.bookingId).filter(Boolean));
    const now = new Date();

    const rows = bookings.map((booking) => {
      const total = booking.totalPrice.toNumber();
      const transferReceived = booking.payment?.method === PaymentMethod.BANK_TRANSFER ? booking.payment.amount.toNumber() : 0;
      const cashCollectedByHost = booking.payment?.method === PaymentMethod.CASH && booking.status !== "CANCELLED"
        ? total
        : booking.payment?.method === PaymentMethod.BANK_TRANSFER && booking.status !== "CANCELLED"
          ? Math.max(0, total - transferReceived)
          : 0;
      const refundAmount = booking.cancellationRefundAmount?.toNumber() ?? 0;
      const penaltyAmount = booking.cancellationPenaltyAmount?.toNumber() ?? 0;
      const isCancelled = booking.status === "CANCELLED";
      const isCompletedLike = booking.status === "COMPLETED" || (booking.status === "CONFIRMED" && booking.checkOut !== null && booking.checkOut <= now);
      const hasDispute = disputedBookingIds.has(booking.id);
      const isRefundedOrRefundPending = isCancelled && refundAmount > 0;
      const isChargeableCancel = isCancelled && penaltyAmount > 0;
      const isEligible = !hasDispute && (isCompletedLike || isChargeableCancel) && !isRefundedOrRefundPending;
      const settlementBase = isChargeableCancel ? penaltyAmount : isEligible ? total : 0;
      const commissionRate = booking.property?.commission?.toNumber() ?? 0.15;
      const commission = Math.round(settlementBase * commissionRate);
      const tripNestHeldForSettlement = isChargeableCancel ? penaltyAmount : isEligible ? transferReceived : 0;
      const hostPayout = Math.max(0, tripNestHeldForSettlement - commission);
      const commissionReceivable = Math.max(0, commission - tripNestHeldForSettlement);
      const hostNet = isEligible ? Math.max(0, cashCollectedByHost + hostPayout - commissionReceivable) : 0;
      const payoutStatus = hasDispute
        ? "PENDING_DISPUTE"
        : isRefundedOrRefundPending
          ? booking.refundStatus === "REFUNDED" ? "REFUNDED" : "REFUND_PENDING"
          : isEligible
            ? "READY_FOR_PAYOUT"
            : "WAITING_STAY";

      return {
        id: booking.id,
        code: `BK-${booking.id.slice(-8).toUpperCase()}`,
        guest: booking.user.email,
        property: booking.property?.title ?? "Chỗ ở",
        city: booking.property?.city ?? "",
        checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
        status: booking.status,
        paymentMethod: booking.payment?.method ?? null,
        grossAmount: total,
        settlementBase,
        transferReceived,
        cashCollectedByHost,
        refundAmount,
        penaltyAmount,
        commissionRate,
        commission,
        hostPayout,
        commissionReceivable,
        hostNet,
        payoutStatus,
      };
    });

    const sum = (selector: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + selector(row), 0);
    const eligibleRows = rows.filter((row) => row.payoutStatus === "READY_FOR_PAYOUT");

    return {
      summary: {
        grossBookingValue: sum((row) => row.grossAmount),
        netHostRevenue: sum((row) => row.hostNet),
        pendingPayout: sum((row) => row.hostPayout),
        commissionReceivable: sum((row) => row.commissionReceivable),
        tripNestHeld: sum((row) => row.transferReceived),
        hostCollectedDirect: sum((row) => row.cashCollectedByHost),
        totalRefund: sum((row) => row.refundAmount),
        disputedBookings: rows.filter((row) => row.payoutStatus === "PENDING_DISPUTE").length,
        readyBookings: eligibleRows.length,
      },
      rows,
    };
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
        payment: {
          select: {
            method: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return bookings.map((booking) => {
      const noteDetails = splitCancellationNotes(booking.notes);

      return ({
      id: booking.id,
      type: booking.type,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.payment?.method ?? null,
      paidAmount: booking.payment?.method === PaymentMethod.BANK_TRANSFER ? booking.payment.amount.toNumber() : 0,
      cancellationRefundAmount: booking.cancellationRefundAmount?.toNumber() ?? null,
      cancellationPenaltyAmount: booking.cancellationPenaltyAmount?.toNumber() ?? null,
      refundStatus: booking.refundStatus ?? null,
      checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
      checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
      tourDate: booking.tourDate?.toISOString().slice(0, 10) ?? null,
      numGuests: booking.numGuests,
      totalPrice: booking.totalPrice.toNumber(),
      createdAt: booking.createdAt.toISOString(),
      cancellationReason: noteDetails.cancellationReason,
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
      });
    });
  },

  async cancelTravelerBooking(input: {
    userId: string;
    bookingId: string;
    reason: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          userId: input.userId,
        },
        select: {
          id: true,
          type: true,
          status: true,
          notes: true,
          checkIn: true,
          totalPrice: true,
          propertyId: true,
          property: { select: { title: true, hostId: true, city: true } },
          tour: { select: { title: true, userId: true } },
          payment: { select: { method: true, amount: true } },
        },
      });

      if (!booking) {
        return { kind: "BOOKING_NOT_FOUND" as const };
      }

      if (booking.status === "CANCELLED") {
        return { kind: "BOOKING_ALREADY_CANCELLED" as const };
      }

      if (booking.status === "COMPLETED") {
        return { kind: "BOOKING_NOT_CANCELLABLE" as const };
      }

      const reason = input.reason.trim();
      const financials = getCancellationFinancials(booking);
      const updated = await tx.booking.update({
        where: { id: input.bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          notes: buildCancellationNotes(booking.notes, reason),
          cancellationRefundAmount: financials.refundAmount,
          cancellationPenaltyAmount: financials.penaltyAmount,
          refundStatus: financials.refundAmount > 0 ? "PENDING" : null,
        },
        select: {
          id: true,
          status: true,
          cancellationRefundAmount: true,
          cancellationPenaltyAmount: true,
          refundStatus: true,
          updatedAt: true,
        },
      });

      const hostId = booking.property?.hostId ?? booking.tour?.userId ?? null;
      const itemTitle = booking.property?.title ?? booking.tour?.title ?? "don dat phong";

      if (hostId) {
        await tx.notification.create({
          data: {
            userId: hostId,
            type: "BOOKING_CANCELLED",
            title: "Khach da huy dat phong",
            message: `Khach da huy don dat ${itemTitle}. Ly do: ${reason}`,
            metadata: {
              bookingId: booking.id,
              propertyId: booking.propertyId,
              action: "TRAVELER_CANCELLED_BOOKING",
              cancellationReason: reason,
            },
          },
        });
      }

      if (financials.refundAmount > 0) {
        const admins = await tx.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              type: "SYSTEM",
              title: "Yêu cầu hoàn tiền đặt chỗ",
              message: `Khách đã hủy ${itemTitle}. Cần hoàn ${financials.refundAmount.toLocaleString("vi-VN")} đ trong vòng 24h.`,
              metadata: {
                bookingId: booking.id,
                propertyId: booking.propertyId,
                action: "BOOKING_REFUND_REQUIRED",
                refundAmount: financials.refundAmount,
              },
            })),
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: input.userId,
          type: "BOOKING_CANCELLED",
          title: financials.refundAmount > 0 ? "Đã hủy đặt chỗ" : "Đã hủy đặt chỗ",
          message: financials.refundAmount > 0
            ? "Bạn sẽ được hoàn tiền trong vòng 24h. Hãy chú ý điện thoại."
            : financials.penaltyAmount > 0
              ? `Bạn đã hủy sau thời hạn miễn phí. Số tiền không hoàn: ${financials.penaltyAmount.toLocaleString("vi-VN")} đ.`
              : "Đơn đặt chỗ đã được hủy.",
          metadata: {
            bookingId: booking.id,
            action: "TRAVELER_CANCELLED_BOOKING",
            refundAmount: financials.refundAmount,
            penaltyAmount: financials.penaltyAmount,
          },
        },
      });

      return {
        kind: "SUCCESS" as const,
        data: {
          id: updated.id,
          status: updated.status,
          cancellationReason: reason,
          cancellationRefundAmount: updated.cancellationRefundAmount?.toNumber() ?? 0,
          cancellationPenaltyAmount: updated.cancellationPenaltyAmount?.toNumber() ?? 0,
          refundStatus: updated.refundStatus,
          refundMessage: financials.refundAmount > 0 ? "Bạn sẽ được hoàn tiền trong vòng 24h. Hãy chú ý điện thoại." : null,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    });
  },

  async reportTravelerBooking(input: {
    userId: string;
    bookingId: string;
    reason: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: input.bookingId, userId: input.userId },
        select: {
          id: true,
          propertyId: true,
          user: { select: { email: true } },
          property: { select: { title: true, hostId: true, city: true } },
        },
      });

      if (!booking || !booking.property) {
        return { kind: "BOOKING_NOT_FOUND" as const };
      }

      const province = await tx.province.findFirst({
        where: { name: { contains: booking.property.city, mode: "insensitive" } },
        select: { id: true },
      });

      const disputeMeta = inferTravelerDisputeMeta(input.reason);
      const reason = input.reason.trim();
      const dispute = await tx.dispute.create({
        data: {
          bookingId: booking.id,
          hostId: booking.property.hostId,
          guestId: input.userId,
          provinceId: province?.id ?? null,
          status: "OPEN",
          reporter: "TRAVELER",
          category: disputeMeta.category,
          severity: disputeMeta.severity,
          subject: `Báo cáo hủy đặt chỗ - ${booking.property.title}`,
          description: reason,
          requestedOutcome: "Operator xem xet chung cu, muc hoan tien va trach nhiem cua Host/Traveler.",
          evidence: {
            source: "TRAVELER_BOOKING_REPORT",
            reason,
            attachments: [],
            createdByEmail: booking.user.email,
          },
          operatorNotes: [],
        },
      });

      return { kind: "SUCCESS" as const, data: dispute };
    });
  },

  async createPropertyBooking(input: {
    userId: string;
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    notes?: string | null;
    paymentOption?: PropertyPaymentOption;
    voucherCode?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      if (input.paymentOption === "DEPOSIT_30" || input.paymentOption === "PAY_FULL") {
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { bankName: true, bankAccountNumber: true },
        });

        if (!user?.bankName?.trim() || !user.bankAccountNumber?.trim()) {
          return { kind: "BANK_ACCOUNT_REQUIRED" as const };
        }
      }

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
      const voucherCode = String(input.voucherCode ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      let promotionId: string | null = null;
      let discountAmount = 0;
      let totalAfterDiscount = pricing.totalPrice;

      if (input.paymentOption === "PAY_AT_PROPERTY" && voucherCode) {
        return { kind: "DIRECT_PAYMENT_VOUCHER_NOT_ALLOWED" as const };
      }

      if (voucherCode) {
        const promotion = await tx.promotion.findUnique({ where: { code: voucherCode } });
        if (!promotion) return { kind: "INVALID_VOUCHER" as const, message: "Không tìm thấy mã voucher." };

        const existingRedemption = await tx.promotionRedemption.findUnique({
          where: {
            promotionId_userId: {
              promotionId: promotion.id,
              userId: input.userId,
            },
          },
          select: { id: true },
        });

        if (existingRedemption) return { kind: "INVALID_VOUCHER" as const, message: "Bạn đã sử dụng mã voucher này." };

        const voucherResult = validateVoucher(promotion, {
          propertyId: input.propertyId,
          code: voucherCode,
          orderValue: pricing.totalPrice,
          guests: input.guests,
        });

        if (!voucherResult.valid) return { kind: "INVALID_VOUCHER" as const, message: voucherResult.message };

        promotionId = promotion.id;
        discountAmount = voucherResult.discountAmount;
        totalAfterDiscount = voucherResult.finalAmount;
      }

      const paymentDetails = getPaymentDetails(input.paymentOption, totalAfterDiscount);

      const booking = await tx.booking.create({
        data: {
          type: BookingType.PROPERTY,
          userId: input.userId,
          propertyId: input.propertyId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          numGuests: input.guests,
          totalPrice: totalAfterDiscount,
          promotionId,
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

      if (promotionId) {
        await tx.promotion.update({
          where: { id: promotionId },
          data: { usedCount: { increment: 1 } },
        });
        await tx.promotionRedemption.create({
          data: {
            promotionId,
            userId: input.userId,
            bookingId: booking.id,
          },
        });
      }

      const isBankTransferPayment = paymentDetails.method === PaymentMethod.BANK_TRANSFER;

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: paymentDetails.amount,
          currency: "VND",
          method: paymentDetails.method,
          status: isBankTransferPayment ? "PAID" : "UNPAID",
          paidAt: isBankTransferPayment ? new Date() : null,
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
          voucher: promotionId
            ? {
                code: voucherCode,
                discountAmount,
                originalTotal: pricing.totalPrice,
                finalTotal: totalAfterDiscount,
              }
            : null,
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
