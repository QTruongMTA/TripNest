import { prisma } from "../lib/prisma";
import { normalizePropertyImageUrl } from "../utils/property-image.utils";

type ConversationWithRelations = Awaited<ReturnType<typeof findConversationForUser>>;

function displayName(user: { displayName: string | null; name: string | null; email: string }) {
  return user.displayName || user.name || user.email;
}

function sideFor(conversation: { guestId: string; hostId: string }, userId: string) {
  if (conversation.guestId === userId) return "guest" as const;
  if (conversation.hostId === userId) return "host" as const;
  return null;
}

async function findConversationForUser(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ guestId: userId }, { hostId: userId }],
    },
    include: {
      property: {
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
            take: 1,
          },
        },
      },
      guest: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
      host: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 80,
        include: {
          sender: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        },
      },
    },
  });
}

function serializeConversation(conversation: NonNullable<ConversationWithRelations>, userId: string) {
  const side = sideFor(conversation, userId);
  const isHost = side === "host";
  const peer = isHost ? conversation.guest : conversation.host;
  const propertyImage = normalizePropertyImageUrl(conversation.property.images[0]?.url, conversation.property.type);

  return {
    id: conversation.id,
    propertyId: conversation.propertyId,
    propertyTitle: conversation.property.title,
    propertyImage,
    guestName: displayName(conversation.guest),
    hostName: displayName(conversation.host),
    peerName: displayName(peer),
    peerAvatar: isHost ? peer.avatar : propertyImage,
    isHost,
    unreadCount: isHost ? conversation.hostUnreadCount : conversation.guestUnreadCount,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    lastMessagePreview: conversation.lastMessagePreview,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      body: message.body,
      imageUrl: message.imageUrl,
      senderId: message.senderId,
      senderName: displayName(message.sender),
      mine: message.senderId === userId,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export const conversationService = {
  async listMine(userId: string, propertyId?: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        OR: [
          { guestId: userId, hiddenForGuestAt: null },
          { hostId: userId, hiddenForHostAt: null },
        ],
      },
      orderBy: [{ lastMessageAt: "desc" }],
      include: {
        property: {
          include: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
              take: 1,
            },
          },
        },
        guest: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        host: { select: { id: true, email: true, name: true, displayName: true, avatar: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
          include: { sender: { select: { id: true, email: true, name: true, displayName: true, avatar: true } } },
        },
      },
    });

    return conversations.map((conversation) => serializeConversation(conversation, userId));
  },

  async unreadCount(userId: string) {
    const [asGuest, asHost] = await Promise.all([
      prisma.conversation.aggregate({
        where: { guestId: userId, hiddenForGuestAt: null },
        _sum: { guestUnreadCount: true },
      }),
      prisma.conversation.aggregate({
        where: { hostId: userId, hiddenForHostAt: null },
        _sum: { hostUnreadCount: true },
      }),
    ]);

    return (asGuest._sum.guestUnreadCount ?? 0) + (asHost._sum.hostUnreadCount ?? 0);
  },

  async start(userId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, hostId: true },
    });

    if (!property) return { kind: "PROPERTY_NOT_FOUND" as const };
    if (property.hostId === userId) return { kind: "CANNOT_MESSAGE_SELF" as const };

    await prisma.conversation.upsert({
      where: { propertyId_guestId: { propertyId, guestId: userId } },
      update: { hiddenForGuestAt: null },
      create: {
        propertyId,
        guestId: userId,
        hostId: property.hostId,
      },
    });

    const conversation = await findConversationForUser(
      (await prisma.conversation.findUniqueOrThrow({ where: { propertyId_guestId: { propertyId, guestId: userId } }, select: { id: true } })).id,
      userId
    );

    return { kind: "SUCCESS" as const, data: serializeConversation(conversation!, userId) };
  },

  async get(userId: string, conversationId: string) {
    const conversation = await findConversationForUser(conversationId, userId);
    if (!conversation) return { kind: "CONVERSATION_NOT_FOUND" as const };
    return { kind: "SUCCESS" as const, data: serializeConversation(conversation, userId) };
  },

  async markRead(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ guestId: userId }, { hostId: userId }] },
      select: { id: true, guestId: true, hostId: true },
    });
    if (!conversation) return { kind: "CONVERSATION_NOT_FOUND" as const };

    const side = sideFor(conversation, userId);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: side === "host" ? { hostUnreadCount: 0 } : { guestUnreadCount: 0 },
    });

    return { kind: "SUCCESS" as const };
  },

  async send(userId: string, conversationId: string, input: { body?: string; imageUrl?: string }) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ guestId: userId }, { hostId: userId }] },
      include: { property: { select: { title: true } }, guest: true, host: true },
    });
    if (!conversation) return { kind: "CONVERSATION_NOT_FOUND" as const };

    const body = input.body?.trim() || null;
    const imageUrl = input.imageUrl?.trim() || null;
    if (!body && !imageUrl) return { kind: "EMPTY_MESSAGE" as const };

    const senderIsHost = conversation.hostId === userId;
    const recipientId = senderIsHost ? conversation.guestId : conversation.hostId;
    const preview = body || "Đã gửi một ảnh";

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.conversationMessage.create({
        data: { conversationId, senderId: userId, body, imageUrl },
        include: { sender: { select: { id: true, email: true, name: true, displayName: true, avatar: true } } },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt,
          lastMessagePreview: preview,
          hiddenForGuestAt: null,
          hiddenForHostAt: null,
          ...(senderIsHost
            ? { guestUnreadCount: { increment: 1 } }
            : { hostUnreadCount: { increment: 1 } }),
        },
      });

      await tx.notification.create({
        data: {
          userId: recipientId,
          type: "SYSTEM",
          title: `Tin nhắn mới - ${conversation.property.title}`,
          message: preview,
          metadata: {
            kind: "CONVERSATION_MESSAGE",
            conversationId,
            propertyId: conversation.propertyId,
          },
        },
      });

      return created;
    });

    return {
      kind: "SUCCESS" as const,
      data: {
        id: message.id,
        body: message.body,
        imageUrl: message.imageUrl,
        senderId: message.senderId,
        senderName: displayName(message.sender),
        mine: true,
        createdAt: message.createdAt.toISOString(),
      },
    };
  },

  async hide(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ guestId: userId }, { hostId: userId }] },
      select: { id: true, guestId: true, hostId: true },
    });
    if (!conversation) return { kind: "CONVERSATION_NOT_FOUND" as const };

    const side = sideFor(conversation, userId);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: side === "host" ? { hiddenForHostAt: new Date(), hostUnreadCount: 0 } : { hiddenForGuestAt: new Date(), guestUnreadCount: 0 },
    });

    return { kind: "SUCCESS" as const };
  },
};
