import { NotificationType } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { createSystemMessage } from "./booking-message.service";

type ViewerRole = "GUEST" | "HOST";

const ACTIVE_STATUSES = ["OPEN", "INVESTIGATING"] as const;

function serializeDispute(d: {
  id: string;
  bookingId: string | null;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  resolvedAt: Date | null;
  escalatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  host?: { email: string; name: string | null } | null;
  guest?: { email: string; name: string | null } | null;
  resolver?: { email: string } | null;
  province?: { name: string } | null;
  booking?: {
    id: string;
    status: string;
    paymentStatus: string;
    checkIn: Date | null;
    checkOut: Date | null;
    property?: { id: string; title: string; city: string } | null;
  } | null;
}) {
  return {
    id: d.id,
    bookingId: d.bookingId,
    status: d.status,
    subject: d.subject,
    description: d.description,
    resolution: d.resolution,
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    escalatedAt: d.escalatedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    host: d.host ?? null,
    guest: d.guest ?? null,
    resolver: d.resolver ?? null,
    province: d.province ?? null,
    booking: d.booking
      ? {
          id: d.booking.id,
          status: d.booking.status,
          paymentStatus: d.booking.paymentStatus,
          checkIn: d.booking.checkIn?.toISOString().slice(0, 10) ?? null,
          checkOut: d.booking.checkOut?.toISOString().slice(0, 10) ?? null,
          property: d.booking.property ?? null,
        }
      : null,
  };
}

async function findProvinceIdByCity(city: string | null | undefined) {
  const cleanCity = city?.trim();
  if (!cleanCity) return null;
  const province = await prisma.province.findFirst({
    where: {
      OR: [
        { name: { equals: cleanCity, mode: "insensitive" } },
        { name: { contains: cleanCity, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return province?.id ?? null;
}

export const bookingDisputeService = {
  async listForBooking(input: { viewerId: string; viewerRole: ViewerRole; bookingId: string }) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        type: "PROPERTY",
        ...(input.viewerRole === "GUEST"
          ? { userId: input.viewerId }
          : { property: { hostId: input.viewerId } }),
      },
      select: { id: true },
    });
    if (!booking) return { kind: "BOOKING_NOT_FOUND" as const };

    const disputes = await prisma.dispute.findMany({
      where: { bookingId: input.bookingId },
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { email: true, name: true } },
        guest: { select: { email: true, name: true } },
        resolver: { select: { email: true } },
        province: { select: { name: true } },
        booking: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            checkIn: true,
            checkOut: true,
            property: { select: { id: true, title: true, city: true } },
          },
        },
      },
    });

    return { kind: "SUCCESS" as const, data: disputes.map(serializeDispute) };
  },

  async createForBooking(input: {
    viewerId: string;
    viewerRole: ViewerRole;
    bookingId: string;
    subject: string;
    description: string;
  }) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        type: "PROPERTY",
        ...(input.viewerRole === "GUEST"
          ? { userId: input.viewerId }
          : { property: { hostId: input.viewerId } }),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        property: { select: { id: true, hostId: true, title: true, city: true } },
      },
    });

    if (!booking || !booking.property) return { kind: "BOOKING_NOT_FOUND" as const };

    const subject = input.subject.trim();
    const description = input.description.trim();
    if (subject.length < 5 || description.length < 10) return { kind: "INVALID_PAYLOAD" as const };

    const activeCount = await prisma.dispute.count({
      where: { bookingId: input.bookingId, status: { in: [...ACTIVE_STATUSES] } },
    });
    if (activeCount > 0) return { kind: "ACTIVE_CASE_EXISTS" as const };

    const provinceId = await findProvinceIdByCity(booking.property.city);
    const openedByLabel = input.viewerRole === "GUEST" ? "khách" : "host";

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          bookingId: booking.id,
          hostId: booking.property!.hostId,
          guestId: booking.userId,
          provinceId,
          subject,
          description,
          status: "OPEN",
        },
        include: {
          host: { select: { email: true, name: true } },
          guest: { select: { email: true, name: true } },
          resolver: { select: { email: true } },
          province: { select: { name: true } },
          booking: {
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              checkIn: true,
              checkOut: true,
              property: { select: { id: true, title: true, city: true } },
            },
          },
        },
      });

      await createSystemMessage(
        tx,
        booking.id,
        `Một support case đã được mở bởi ${openedByLabel}: ${subject}`,
      );

      return created;
    });

    const notifyUserId = input.viewerRole === "GUEST" ? booking.property.hostId : booking.userId;
    prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: NotificationType.SYSTEM,
        title: "Có support case mới",
        message: `${openedByLabel === "khách" ? "Khách" : "Host"} đã mở case cho booking ${booking.id.slice(-8).toUpperCase()}.`,
        metadata: { bookingId: booking.id, disputeId: dispute.id },
      },
    }).catch(() => {});

    return { kind: "SUCCESS" as const, data: serializeDispute(dispute) };
  },
};
