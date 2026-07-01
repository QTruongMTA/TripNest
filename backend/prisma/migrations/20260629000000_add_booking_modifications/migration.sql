-- CreateEnum: ModificationStatus
CREATE TYPE "ModificationStatus" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'
);

-- AlterEnum: NotificationType — add modification notification types
ALTER TYPE "NotificationType" ADD VALUE 'MODIFICATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'MODIFICATION_RESPONDED';

-- CreateTable: BookingModification
CREATE TABLE "BookingModification" (
    "id"              TEXT              NOT NULL,
    "bookingId"       TEXT              NOT NULL,
    "requestedBy"     TEXT              NOT NULL,
    "requesterRole"   TEXT              NOT NULL,
    "status"          "ModificationStatus" NOT NULL DEFAULT 'PENDING',
    "newCheckIn"      TIMESTAMP(3),
    "newCheckOut"     TIMESTAMP(3),
    "newNumGuests"    INTEGER,
    "oldCheckIn"      TIMESTAMP(3),
    "oldCheckOut"     TIMESTAMP(3),
    "oldNumGuests"    INTEGER           NOT NULL,
    "oldTotalPrice"   DECIMAL(10,2)     NOT NULL,
    "newTotalPrice"   DECIMAL(10,2)     NOT NULL,
    "priceDelta"      DECIMAL(10,2)     NOT NULL,
    "expiresAt"       TIMESTAMP(3)      NOT NULL,
    "respondedAt"     TIMESTAMP(3),
    "respondedBy"     TEXT,
    "rejectionReason" TEXT,
    "createdAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingModification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingModification_bookingId_idx"   ON "BookingModification"("bookingId");
CREATE INDEX "BookingModification_status_idx"      ON "BookingModification"("status");
CREATE INDEX "BookingModification_expiresAt_idx"   ON "BookingModification"("expiresAt");
CREATE INDEX "BookingModification_requestedBy_idx" ON "BookingModification"("requestedBy");

-- Partial unique index: at most 1 PENDING modification per booking at a time
CREATE UNIQUE INDEX "BookingModification_bookingId_pending_unique"
    ON "BookingModification"("bookingId")
    WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "BookingModification"
    ADD CONSTRAINT "BookingModification_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingModification"
    ADD CONSTRAINT "BookingModification_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON UPDATE CASCADE;

ALTER TABLE "BookingModification"
    ADD CONSTRAINT "BookingModification_respondedBy_fkey"
    FOREIGN KEY ("respondedBy") REFERENCES "User"("id") ON UPDATE CASCADE;
