CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessagePreview" TEXT,
  "guestUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "hostUnreadCount" INTEGER NOT NULL DEFAULT 0,
  "hiddenForGuestAt" TIMESTAMP(3),
  "hiddenForHostAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_propertyId_guestId_key" ON "Conversation"("propertyId", "guestId");
CREATE INDEX "Conversation_guestId_idx" ON "Conversation"("guestId");
CREATE INDEX "Conversation_hostId_idx" ON "Conversation"("hostId");
CREATE INDEX "Conversation_propertyId_idx" ON "Conversation"("propertyId");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX "ConversationMessage_conversationId_idx" ON "ConversationMessage"("conversationId");
CREATE INDEX "ConversationMessage_senderId_idx" ON "ConversationMessage"("senderId");
CREATE INDEX "ConversationMessage_createdAt_idx" ON "ConversationMessage"("createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
