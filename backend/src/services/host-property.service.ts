import { AvailabilityStatus, BookingMethod, BookingStatus, CancellationPolicy, ListingStatus, ParkingType, PetPolicy, PropertyType } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

function toNum(v: { toNumber(): number } | null | undefined): number | null {
  return v ? v.toNumber() : null;
}

export const hostPropertyService = {
  async getHostPropertyById(hostId: string, propertyId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { id: "asc" }] },
        amenities: { orderBy: { name: "asc" } },
        languages: true,
        bedrooms: { orderBy: { roomNumber: "asc" } },
        childPricing: true,
        ratePlans: true,
      },
    });
    if (!property) return null;

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      status: property.status,
      type: property.type,
      addressLine1: property.addressLine1,
      addressLine2: property.addressLine2,
      city: property.city,
      postalCode: property.postalCode,
      country: property.country,
      pricePerNight: property.pricePerNight.toNumber(),
      cleaningFee: toNum(property.cleaningFee),
      maxGuests: property.maxGuests,
      bedroomCount: property.bedroomCount,
      bathrooms: property.bathrooms,
      bookingMethod: property.bookingMethod,
      cancellationPolicy: property.cancellationPolicy,
      cancellationFreeDays: property.cancellationFreeDays,
      smokingAllowed: property.smokingAllowed,
      partiesAllowed: property.partiesAllowed,
      petsPolicy: property.petsPolicy,
      checkInFrom: property.checkInFrom,
      checkInTo: property.checkInTo,
      checkOutFrom: property.checkOutFrom,
      checkOutTo: property.checkOutTo,
      availabilityWindow: property.availabilityWindow,
      amenities: property.amenities.map((a) => ({ id: a.id, name: a.name, icon: a.icon })),
      languages: property.languages.map((l) => l.language),
      images: property.images.flatMap((img) => {
        const url = normalizePropertyImageUrl(img.url, property.type);
        return url ? [{ id: img.id, url, isPrimary: img.isPrimary }] : [];
      }),
      updatedAt: property.updatedAt.toISOString(),
    };
  },

  async updateHostPropertyInfo(
    hostId: string,
    propertyId: string,
    data: {
      title?: string;
      description?: string | null;
      type?: PropertyType;
      addressLine1?: string;
      addressLine2?: string | null;
      city?: string;
      country?: string;
      maxGuests?: number;
      bathrooms?: number;
      amenities?: string[];
      languages?: string[];
    }
  ) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    return prisma.$transaction(async (tx) => {
      if (data.amenities !== undefined) {
        await tx.property.update({
          where: { id: propertyId },
          data: { amenities: { set: [] } },
        });
      }
      if (data.languages !== undefined) {
        await tx.propertyLanguage.deleteMany({ where: { propertyId } });
      }

      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          ...(data.title !== undefined ? { title: data.title.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1.trim() } : {}),
          ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
          ...(data.city !== undefined ? { city: data.city.trim() } : {}),
          ...(data.country !== undefined ? { country: data.country.trim() } : {}),
          ...(data.maxGuests !== undefined ? { maxGuests: data.maxGuests } : {}),
          ...(data.bathrooms !== undefined ? { bathrooms: data.bathrooms } : {}),
          ...(data.amenities !== undefined && data.amenities.length > 0
            ? {
                amenities: {
                  connectOrCreate: data.amenities.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                },
              }
            : {}),
          ...(data.languages !== undefined && data.languages.length > 0
            ? { languages: { create: data.languages.map((language) => ({ language })) } }
            : {}),
        },
        select: { id: true, updatedAt: true },
      });
      return updated;
    });
  },

  async updateHostPropertyPricing(
    hostId: string,
    propertyId: string,
    data: {
      pricePerNight?: number;
      cleaningFee?: number | null;
    }
  ) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    return prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(data.pricePerNight !== undefined ? { pricePerNight: data.pricePerNight } : {}),
        ...(data.cleaningFee !== undefined ? { cleaningFee: data.cleaningFee } : {}),
      },
      select: { id: true, pricePerNight: true, cleaningFee: true, updatedAt: true },
    });
  },

  async updateHostPropertyPolicies(
    hostId: string,
    propertyId: string,
    data: {
      bookingMethod?: BookingMethod;
      cancellationPolicy?: CancellationPolicy;
      cancellationFreeDays?: number;
      smokingAllowed?: boolean;
      partiesAllowed?: boolean;
      petsPolicy?: PetPolicy;
      checkInFrom?: string | null;
      checkInTo?: string | null;
      checkOutFrom?: string | null;
      checkOutTo?: string | null;
      availabilityWindow?: number;
    }
  ) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    return prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(data.bookingMethod !== undefined ? { bookingMethod: data.bookingMethod } : {}),
        ...(data.cancellationPolicy !== undefined ? { cancellationPolicy: data.cancellationPolicy } : {}),
        ...(data.cancellationFreeDays !== undefined ? { cancellationFreeDays: data.cancellationFreeDays } : {}),
        ...(data.smokingAllowed !== undefined ? { smokingAllowed: data.smokingAllowed } : {}),
        ...(data.partiesAllowed !== undefined ? { partiesAllowed: data.partiesAllowed } : {}),
        ...(data.petsPolicy !== undefined ? { petsPolicy: data.petsPolicy } : {}),
        ...(data.checkInFrom !== undefined ? { checkInFrom: data.checkInFrom } : {}),
        ...(data.checkInTo !== undefined ? { checkInTo: data.checkInTo } : {}),
        ...(data.checkOutFrom !== undefined ? { checkOutFrom: data.checkOutFrom } : {}),
        ...(data.checkOutTo !== undefined ? { checkOutTo: data.checkOutTo } : {}),
        ...(data.availabilityWindow !== undefined ? { availabilityWindow: data.availabilityWindow } : {}),
      },
      select: { id: true, updatedAt: true },
    });
  },

  async toggleHostPropertyStatus(hostId: string, propertyId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true, status: true },
    });
    if (!property) return { kind: "NOT_FOUND" as const };
    if (property.status !== ListingStatus.ACTIVE && property.status !== ListingStatus.INACTIVE) {
      return { kind: "CANNOT_TOGGLE" as const, currentStatus: property.status };
    }

    const nextStatus = property.status === ListingStatus.ACTIVE
      ? ListingStatus.INACTIVE
      : ListingStatus.ACTIVE;

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { status: nextStatus },
      select: { id: true, status: true, updatedAt: true },
    });
    return { kind: "SUCCESS" as const, data: updated };
  },

  // ── Availability calendar ────────────────────────────────────────────────

  async getPropertyCalendar(hostId: string, propertyId: string, year: number, month: number) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    const rangeStart = new Date(Date.UTC(year, month - 1, 1));
    const rangeEnd = new Date(Date.UTC(year, month, 1)); // exclusive

    const [blocked, bookings, dailyRates] = await Promise.all([
      prisma.propertyAvailability.findMany({
        where: { propertyId, date: { gte: rangeStart, lt: rangeEnd } },
        select: { date: true, status: true, reason: true },
      }),
      prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          checkIn: { lt: rangeEnd },
          checkOut: { gt: rangeStart },
        },
        select: { id: true, checkIn: true, checkOut: true, status: true },
      }),
      prisma.propertyDailyRate.findMany({
        where: { propertyId, date: { gte: rangeStart, lt: rangeEnd } },
        select: { date: true, price: true, minStay: true, maxStay: true, closedToArrival: true, closedToDeparture: true, note: true },
      }),
    ]);

    const rateMap = new Map(dailyRates.map((r) => [r.date.toISOString().slice(0, 10), r]));

    // Build day map: date string → state
    const dayMap = new Map<string, { state: string; bookingId?: string; bookingStatus?: string; reason?: string }>();

    for (const slot of blocked) {
      const key = slot.date.toISOString().slice(0, 10);
      const entry: { state: string; reason?: string } = {
        state: slot.status === AvailabilityStatus.MAINTENANCE ? "maintenance" : "blocked",
      };
      if (slot.reason) entry.reason = slot.reason;
      dayMap.set(key, entry);
    }

    // Bookings override blocked (a booked day cannot be re-blocked)
    for (const booking of bookings) {
      if (!booking.checkIn || !booking.checkOut) continue;
      const cursor = new Date(booking.checkIn);
      while (cursor < booking.checkOut && cursor < rangeEnd) {
        if (cursor >= rangeStart) {
          const key = cursor.toISOString().slice(0, 10);
          dayMap.set(key, {
            state: "booked",
            bookingId: booking.id,
            bookingStatus: booking.status,
          });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    // Build the result array for every day in the month
    type DayEntry = {
      date: string; state: string;
      bookingId?: string; bookingStatus?: string; reason?: string;
      price?: number | null; minStay?: number | null; maxStay?: number | null;
      closedToArrival?: boolean; closedToDeparture?: boolean; note?: string | null;
    };
    const days: DayEntry[] = [];
    const cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const key = cursor.toISOString().slice(0, 10);
      const rate = rateMap.get(key);
      days.push({
        date: key,
        ...(dayMap.get(key) ?? { state: "available" }),
        ...(rate ? {
          price: rate.price != null ? Number(rate.price) : null,
          minStay: rate.minStay,
          maxStay: rate.maxStay,
          closedToArrival: rate.closedToArrival,
          closedToDeparture: rate.closedToDeparture,
          note: rate.note,
        } : {}),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { year, month, propertyId, days };
  },

  async blockPropertyDates(
    hostId: string,
    propertyId: string,
    dates: string[],
    status: AvailabilityStatus = AvailabilityStatus.BLOCKED,
    reason?: string
  ) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    // Filter out dates that already have a booking
    const parsedDates = dates
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .map((d) => new Date(`${d}T00:00:00.000Z`));

    if (parsedDates.length === 0) return { created: 0 };

    const minDate = parsedDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = parsedDates.reduce((a, b) => (a > b ? a : b));
    const dayAfterMax = new Date(maxDate);
    dayAfterMax.setUTCDate(dayAfterMax.getUTCDate() + 1);

    const bookedDates = await prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        checkIn: { lt: dayAfterMax },
        checkOut: { gt: minDate },
      },
      select: { checkIn: true, checkOut: true },
    });

    const bookedSet = new Set<string>();
    for (const booking of bookedDates) {
      if (!booking.checkIn || !booking.checkOut) continue;
      const c = new Date(booking.checkIn);
      while (c < booking.checkOut) {
        bookedSet.add(c.toISOString().slice(0, 10));
        c.setUTCDate(c.getUTCDate() + 1);
      }
    }

    const availableDates = parsedDates.filter(
      (d) => !bookedSet.has(d.toISOString().slice(0, 10))
    );

    if (availableDates.length === 0) return { created: 0 };

    const result = await prisma.propertyAvailability.createMany({
      data: availableDates.map((date) => ({
        propertyId,
        date,
        status,
        reason: reason ?? null,
      })),
      skipDuplicates: true,
    });

    return { created: result.count };
  },

  async unblockPropertyDates(hostId: string, propertyId: string, dates: string[]) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    const parsedDates = dates
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .map((d) => new Date(`${d}T00:00:00.000Z`));

    if (parsedDates.length === 0) return { deleted: 0 };

    const result = await prisma.propertyAvailability.deleteMany({
      where: { propertyId, date: { in: parsedDates } },
    });

    return { deleted: result.count };
  },

  // ── Daily rate management ─────────────────────────────────────────────────

  async setDailyRates(
    hostId: string,
    propertyId: string,
    items: Array<{
      date: string;
      price?: number | null;
      minStay?: number | null;
      maxStay?: number | null;
      closedToArrival?: boolean;
      closedToDeparture?: boolean;
      note?: string | null;
      _delete?: boolean;
    }>,
  ) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true },
    });
    if (!exists) return null;

    const validItems = items.filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date));

    // Items flagged _delete OR all fields at their defaults → remove row (keep DB clean)
    function isAllDefault(i: (typeof validItems)[0]) {
      return (
        i.price == null &&
        !i.minStay &&
        !i.maxStay &&
        !i.closedToArrival &&
        !i.closedToDeparture &&
        !i.note
      );
    }

    const toDelete = validItems
      .filter((i) => i._delete || isAllDefault(i))
      .map((i) => new Date(`${i.date}T00:00:00.000Z`));

    const toUpsert = validItems.filter((i) => !i._delete && !isAllDefault(i));

    await prisma.$transaction([
      ...(toDelete.length > 0
        ? [prisma.propertyDailyRate.deleteMany({ where: { propertyId, date: { in: toDelete } } })]
        : []),
      ...toUpsert.map((item) => {
        const date = new Date(`${item.date}T00:00:00.000Z`);
        const payload = {
          price: item.price ?? null,
          minStay: item.minStay ?? null,
          maxStay: item.maxStay ?? null,
          closedToArrival: item.closedToArrival ?? false,
          closedToDeparture: item.closedToDeparture ?? false,
          note: item.note ?? null,
        };
        return prisma.propertyDailyRate.upsert({
          where: { propertyId_date: { propertyId, date } },
          create: { propertyId, date, ...payload },
          update: payload,
        });
      }),
    ]);

    return { upserted: toUpsert.length, deleted: toDelete.length };
  },

  // ── Rate plan management ──────────────────────────────────────────────────

  async listRatePlans(hostId: string, propertyId: string) {
    const exists = await prisma.property.findFirst({ where: { id: propertyId, hostId }, select: { id: true } });
    if (!exists) return null;
    return prisma.propertyRatePlan.findMany({
      where: { propertyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async createRatePlan(
    hostId: string,
    propertyId: string,
    input: {
      name: string;
      type?: string;
      priceAdjustmentType?: string;
      priceAdjustmentValue?: number;
      cancellationPolicy?: string | null;
      cancellationFreeDays?: number | null;
      minStay?: number | null;
      maxStay?: number | null;
      breakfastIncluded?: boolean;
      sortOrder?: number;
    },
  ) {
    const exists = await prisma.property.findFirst({ where: { id: propertyId, hostId }, select: { id: true } });
    if (!exists) return null;
    return prisma.propertyRatePlan.create({
      data: {
        propertyId,
        name: input.name.trim(),
        type: (input.type ?? "STANDARD") as never,
        isActive: true,
        priceAdjustmentType: (input.priceAdjustmentType ?? "NONE") as never,
        priceAdjustmentValue: input.priceAdjustmentValue ?? 0,
        cancellationPolicy: (input.cancellationPolicy ?? null) as never,
        cancellationFreeDays: input.cancellationFreeDays ?? null,
        minStay: input.minStay ?? null,
        maxStay: input.maxStay ?? null,
        breakfastIncluded: input.breakfastIncluded ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  },

  async updateRatePlan(
    hostId: string,
    propertyId: string,
    ratePlanId: string,
    input: {
      name?: string;
      type?: string;
      priceAdjustmentType?: string;
      priceAdjustmentValue?: number;
      cancellationPolicy?: string | null;
      cancellationFreeDays?: number | null;
      minStay?: number | null;
      maxStay?: number | null;
      breakfastIncluded?: boolean;
      sortOrder?: number;
    },
  ) {
    const plan = await prisma.propertyRatePlan.findFirst({
      where: { id: ratePlanId, propertyId, property: { hostId } },
      select: { id: true },
    });
    if (!plan) return null;
    return prisma.propertyRatePlan.update({
      where: { id: ratePlanId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.type !== undefined && { type: input.type as never }),
        ...(input.priceAdjustmentType !== undefined && { priceAdjustmentType: input.priceAdjustmentType as never }),
        ...(input.priceAdjustmentValue !== undefined && { priceAdjustmentValue: input.priceAdjustmentValue }),
        ...(input.cancellationPolicy !== undefined && { cancellationPolicy: (input.cancellationPolicy ?? null) as never }),
        ...(input.cancellationFreeDays !== undefined && { cancellationFreeDays: input.cancellationFreeDays }),
        ...(input.minStay !== undefined && { minStay: input.minStay }),
        ...(input.maxStay !== undefined && { maxStay: input.maxStay }),
        ...(input.breakfastIncluded !== undefined && { breakfastIncluded: input.breakfastIncluded }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  },

  async toggleRatePlan(hostId: string, propertyId: string, ratePlanId: string, isActive: boolean) {
    const plan = await prisma.propertyRatePlan.findFirst({
      where: { id: ratePlanId, propertyId, property: { hostId } },
      select: { id: true },
    });
    if (!plan) return null;
    return prisma.propertyRatePlan.update({ where: { id: ratePlanId }, data: { isActive } });
  },

  async deleteRatePlan(hostId: string, propertyId: string, ratePlanId: string) {
    const plan = await prisma.propertyRatePlan.findFirst({
      where: { id: ratePlanId, propertyId, property: { hostId } },
      select: { id: true },
    });
    if (!plan) return null;
    await prisma.propertyRatePlan.delete({ where: { id: ratePlanId } });
    return true;
  },

  // ── Image management ─────────────────────────────────────────────────────

  async addPropertyImage(hostId: string, propertyId: string, url: string, isPrimary: boolean) {
    const exists = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      select: { id: true, type: true },
    });
    if (!exists) return null;

    return prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.propertyImage.updateMany({
          where: { propertyId },
          data: { isPrimary: false },
        });
      }
      return tx.propertyImage.create({
        data: { propertyId, url, isPrimary },
        select: { id: true, url: true, isPrimary: true },
      });
    });
  },

  async deletePropertyImage(hostId: string, propertyId: string, imageId: string) {
    const image = await prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId, property: { hostId } },
      select: { id: true, isPrimary: true },
    });
    if (!image) return { kind: "NOT_FOUND" as const };

    await prisma.propertyImage.delete({ where: { id: imageId } });

    // If we deleted the primary, promote the next image
    if (image.isPrimary) {
      const next = await prisma.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { id: "asc" },
      });
      if (next) {
        await prisma.propertyImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return { kind: "SUCCESS" as const };
  },

  async setPrimaryImage(hostId: string, propertyId: string, imageId: string) {
    const image = await prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId, property: { hostId } },
      select: { id: true },
    });
    if (!image) return { kind: "NOT_FOUND" as const };

    await prisma.$transaction([
      prisma.propertyImage.updateMany({
        where: { propertyId },
        data: { isPrimary: false },
      }),
      prisma.propertyImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return { kind: "SUCCESS" as const };
  },
};
