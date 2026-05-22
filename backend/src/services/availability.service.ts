import { BookingStatus, ListingStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

const blockingBookingStatuses = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

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
      },
    });

    if (!property) return null;

    const [blockedDates, conflictingBookings] = await prisma.$transaction([
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
          status: true,
        },
        orderBy: { checkIn: "asc" },
      }),
    ]);

    const guestLimitExceeded = input.guests > property.maxGuests;
    const available =
      !guestLimitExceeded &&
      blockedDates.length === 0 &&
      conflictingBookings.length === 0;

    return {
      propertyId: property.id,
      available,
      maxGuests: property.maxGuests,
      requestedGuests: input.guests,
      blockedDates: blockedDates.map((slot) => ({
        date: slot.date.toISOString().slice(0, 10),
        status: slot.status,
      })),
      conflictingBookings: conflictingBookings.map((booking) => ({
        id: booking.id,
        checkIn: booking.checkIn?.toISOString().slice(0, 10) ?? null,
        checkOut: booking.checkOut?.toISOString().slice(0, 10) ?? null,
        status: booking.status,
      })),
      reasons: [
        ...(guestLimitExceeded ? ["GUEST_LIMIT_EXCEEDED"] : []),
        ...(blockedDates.length > 0 ? ["BLOCKED_DATES"] : []),
        ...(conflictingBookings.length > 0 ? ["BOOKING_CONFLICT"] : []),
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
