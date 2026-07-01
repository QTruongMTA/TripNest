import { NotificationType } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

// ── Types ──────────────────────────────────────────────────────────────────

export type MessagePublic = {
  id: string;
  bookingId: string;
  senderId: string | null;
  senderRole: string;
  senderName: string | null;
  senderAvatar: string | null;
  message: string;
  isReadByGuest: boolean;
  isReadByHost: boolean;
  createdAt: string;
};

// ── Tx client type (standard Prisma pattern) ────────────────────────────────

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ── Serializer ─────────────────────────────────────────────────────────────

function serialize(m: {
  id: string; bookingId: string; senderId: string | null; senderRole: string;
  message: string; isReadByGuest: boolean; isReadByHost: boolean; createdAt: Date;
  sender?: { name: string | null; avatar: string | null } | null;
}): MessagePublic {
  return {
    id: m.id,
    bookingId: m.bookingId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.sender?.name ?? null,
    senderAvatar: m.sender?.avatar ?? null,
    message: m.message,
    isReadByGuest: m.isReadByGuest,
    isReadByHost: m.isReadByHost,
    createdAt: m.createdAt.toISOString(),
  };
}

// ── Public utility: create a system message inside a transaction ────────────

export async function createSystemMessage(
  tx: TxClient,
  bookingId: string,
  message: string,
): Promise<void> {
  await tx.bookingMessage.create({
    data: { bookingId, senderRole: "SYSTEM", message, isReadByGuest: false, isReadByHost: false },
  });
}

// ── Service ────────────────────────────────────────────────────────────────

export const bookingMessageService = {

  // ── List + mark read atomically ──────────────────────────────────────────
  async listAndMarkRead(
    bookingId: string,
    viewerId: string,
    viewerRole: "GUEST" | "HOST",
  ): Promise<MessagePublic[] | null> {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...(viewerRole === "GUEST"
          ? { userId: viewerId }
          : { type: "PROPERTY", property: { hostId: viewerId } }),
      },
      select: { id: true },
    });
    if (!booking) return null;

    const messages = await prisma.bookingMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { name: true, avatar: true } } },
    });

    // Best-effort mark-read (don't block the response)
    const readField = viewerRole === "GUEST" ? "isReadByGuest" : "isReadByHost";
    prisma.bookingMessage.updateMany({
      where: { bookingId, [readField]: false, NOT: { senderRole: viewerRole } },
      data: { [readField]: true },
    }).catch(() => {});

    return messages.map(serialize);
  },

  // ── Send a message ────────────────────────────────────────────────────────
  async sendMessage(
    bookingId: string,
    senderId: string,
    senderRole: "GUEST" | "HOST",
    message: string,
  ) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        ...(senderRole === "GUEST"
          ? { userId: senderId }
          : { type: "PROPERTY", property: { hostId: senderId } }),
      },
      select: {
        id: true, userId: true,
        property: { select: { hostId: true, title: true } },
      },
    });
    if (!booking) return { kind: "NOT_FOUND" as const };

    const trimmed = message.trim();
    if (!trimmed) return { kind: "EMPTY_MESSAGE" as const };

    const msg = await prisma.bookingMessage.create({
      data: {
        bookingId,
        senderId,
        senderRole,
        message: trimmed,
        isReadByGuest: senderRole === "GUEST",
        isReadByHost:  senderRole === "HOST",
      },
      include: { sender: { select: { name: true, avatar: true } } },
    });

    // Notify other party (best-effort)
    const notifyUserId = senderRole === "GUEST"
      ? booking.property?.hostId ?? null
      : booking.userId;
    if (notifyUserId) {
      prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: NotificationType.MESSAGE_RECEIVED,
          title: `Tin nhắn mới từ ${senderRole === "GUEST" ? "khách" : "host"}`,
          message: trimmed.slice(0, 100),
          metadata: { bookingId, messageId: msg.id },
        },
      }).catch(() => {});
    }

    return { kind: "SUCCESS" as const, data: serialize(msg) };
  },

  // ── Get unread counts for multiple bookings (for host list badges) ─────────
  async getUnreadCountsForHost(bookingIds: string[]): Promise<Record<string, number>> {
    if (bookingIds.length === 0) return {};
    const rows = await prisma.bookingMessage.groupBy({
      by: ["bookingId"],
      where: { bookingId: { in: bookingIds }, isReadByHost: false, NOT: { senderRole: "HOST" } },
      _count: { _all: true },
    });
    const result: Record<string, number> = {};
    for (const r of rows) result[r.bookingId] = r._count._all;
    return result;
  },
};
