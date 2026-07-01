-- CreateTable: BookingEvent — immutable audit log for booking lifecycle
CREATE TABLE "BookingEvent" (
    "id"        TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId"   TEXT,
    "actorRole" TEXT,
    "type"      TEXT NOT NULL,
    "message"   TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_idx" ON "BookingEvent"("bookingId");
CREATE INDEX "BookingEvent_createdAt_idx" ON "BookingEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
