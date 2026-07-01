-- Add MESSAGE_RECEIVED notification type
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE_RECEIVED';

-- BookingMessage table
CREATE TABLE "BookingMessage" (
    "id"            TEXT        NOT NULL,
    "bookingId"     TEXT        NOT NULL,
    "senderId"      TEXT,
    "senderRole"    TEXT        NOT NULL,
    "message"       TEXT        NOT NULL,
    "isReadByGuest" BOOLEAN     NOT NULL DEFAULT false,
    "isReadByHost"  BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingMessage_bookingId_idx" ON "BookingMessage"("bookingId");
CREATE INDEX "BookingMessage_createdAt_idx" ON "BookingMessage"("createdAt");
CREATE INDEX "BookingMessage_senderId_idx"  ON "BookingMessage"("senderId");

ALTER TABLE "BookingMessage"
    ADD CONSTRAINT "BookingMessage_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingMessage"
    ADD CONSTRAINT "BookingMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
