import { BookingStatus, ListingStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { pricingService } from "./pricing.service";

const blockingBookingStatuses = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

function getIsoDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getStayDateKeys(checkIn: Date, checkOut: Date) {
  const keys: string[] = [];
  for (let cursor = new Date(checkIn); cursor < checkOut; cursor = addDays(cursor, 1)) {
    keys.push(getIsoDateKey(cursor));
  }
  return keys;
}

export function calculatePropertyGuestOccupancy(
  bookings: Array<{ checkIn: Date | null; checkOut: Date | null; numGuests: number }>,
  checkIn: Date,
  checkOut: Date
) {
  const occupancy = new Map<string, number>();
  for (const booking of bookings) {
    if (!booking.checkIn || !booking.checkOut) continue;
    const start = booking.checkIn > checkIn ? booking.checkIn : checkIn;
    const end = booking.checkOut < checkOut ? booking.checkOut : checkOut;
    for (const dateKey of getStayDateKeys(start, end)) {
      occupancy.set(dateKey, (occupancy.get(dateKey) ?? 0) + booking.numGuests);
    }
  }
  return occupancy;
}

export function hasPropertyGuestCapacity(input: {
  maxGuests: number;
  requestedGuests: number;
  checkIn: Date;
  checkOut: Date;
  bookings: Array<{ checkIn: Date | null; checkOut: Date | null; numGuests: number }>;
}) {
  const occupancy = calculatePropertyGuestOccupancy(input.bookings, input.checkIn, input.checkOut);
  return getStayDateKeys(input.checkIn, input.checkOut).every(
    (dateKey) => (occupancy.get(dateKey) ?? 0) + input.requestedGuests <= input.maxGuests
  );
}

export const availabilityService = {
  async checkPropertyAvailability(input: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
  }) {
    const property = await prisma.property.findFirst({
      where: {
        id: input.propertyId,
        status: ListingStatus.ACTIVE,
      },
      select: {
        id: true,
        maxGuests: true,
        pricePerNight: true,
        cleaningFee: true,
      },
    });

    if (!property) return null;

    const [blockedDates, conflictingBookings, dailyRates] = await prisma.$transaction([
      prisma.propertyAvailability.findMany({
        where: {
          propertyId: input.propertyId,
          date: {
            gte: input.checkIn,
            lt: input.checkOut,
          },
        },
        select: {
          date: true,
          status: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          propertyId: input.propertyId,
          status: { in: [...blockingBookingStatuses] },
          checkIn: { lt: input.checkOut },
          checkOut: { gt: input.checkIn },
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          numGuests: true,
          status: true,
        },
        orderBy: { checkIn: "asc" },
      }),
      prisma.$queryRaw<Array<{ date: Date; pricePerNight: string }>>`
        SELECT "date", "price" AS "pricePerNight"
        FROM "PropertyDailyRate"
        WHERE "propertyId" = ${input.propertyId}
          AND "date" >= ${input.checkIn}
          AND "date" < ${input.checkOut}
        ORDER BY "date" ASC
      `,
    ]);

    const guestLimitExceeded = input.guests > property.maxGuests;
    const capacityExceeded = !guestLimitExceeded && !hasPropertyGuestCapacity({
      maxGuests: property.maxGuests,
      requestedGuests: input.guests,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      bookings: conflictingBookings,
    });
    const available =
      !guestLimitExceeded &&
      !capacityExceeded &&
      blockedDates.length === 0;
    const pricing = pricingService.calculatePropertyTotal({
      pricePerNight: property.pricePerNight,
      cleaningFee: property.cleaningFee,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      dailyRates,
    });

    return {
      propertyId: property.id,
      available,
      maxGuests: property.maxGuests,
      requestedGuests: input.guests,
      pricing: {
        nights: pricing.nights,
        stayPrice: pricing.stayPrice,
        cleaningFee: pricing.cleaningFee,
        totalPrice: pricing.totalPrice,
        dailyRates: dailyRates.map((rate) => ({
          date: rate.date.toISOString().slice(0, 10),
          pricePerNight: Number(rate.pricePerNight),
        })),
      },
      blockedDates: blockedDates.map((slot) => ({
        date: slot.date.toISOString().slice(0, 10),
        status: slot.status,
      })),
      conflictingBookings: conflictingBookings.map((booking) => ({
        id: booking.id,
        checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
        numGuests: booking.numGuests,
        status: booking.status,
      })),
      reasons: [
        ...(guestLimitExceeded ? ["GUEST_LIMIT_EXCEEDED"] : []),
        ...(blockedDates.length > 0 ? ["BLOCKED_DATES"] : []),
        ...(capacityExceeded ? ["CAPACITY_EXCEEDED"] : []),
      ],
    };
  },

  async checkTourAvailability(input: {
    tourId: string;
    date: Date;
    guests: number;
  }) {
    const tour = await prisma.tour.findFirst({
      where: {
        id: input.tourId,
        status: ListingStatus.ACTIVE,
      },
      select: {
        id: true,
        minGroupSize: true,
        maxGroupSize: true,
      },
    });

    if (!tour) return null;

    const availability = await prisma.tourAvailability.findUnique({
      where: {
        tourId_date: {
          tourId: input.tourId,
          date: input.date,
        },
      },
      select: {
        date: true,
        slotsTotal: true,
        slotsBooked: true,
        isActive: true,
      },
    });

    const slotsRemaining = availability
      ? availability.slotsTotal - availability.slotsBooked
      : 0;
    const groupTooSmall = input.guests < tour.minGroupSize;
    const groupTooLarge = input.guests > tour.maxGroupSize;
    const unavailableDate = !availability || !availability.isActive;
    const insufficientSlots = slotsRemaining < input.guests;
    const available =
      !groupTooSmall &&
      !groupTooLarge &&
      !unavailableDate &&
      !insufficientSlots;

    return {
      tourId: tour.id,
      date: input.date.toISOString().slice(0, 10),
      available,
      requestedGuests: input.guests,
      minGroupSize: tour.minGroupSize,
      maxGroupSize: tour.maxGroupSize,
      slotsTotal: availability?.slotsTotal ?? 0,
      slotsBooked: availability?.slotsBooked ?? 0,
      slotsRemaining,
      reasons: [
        ...(groupTooSmall ? ["GROUP_TOO_SMALL"] : []),
        ...(groupTooLarge ? ["GROUP_TOO_LARGE"] : []),
        ...(unavailableDate ? ["DATE_UNAVAILABLE"] : []),
        ...(insufficientSlots && !unavailableDate ? ["INSUFFICIENT_SLOTS"] : []),
      ],
    };
  },
};
