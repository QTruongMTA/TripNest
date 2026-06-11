ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';

CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'HELD');

ALTER TABLE "Booking"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "checkedInAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE TABLE "Settlement" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "grossAmount" DECIMAL(10,2) NOT NULL,
  "platformFee" DECIMAL(10,2) NOT NULL,
  "hostAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "availableAt" TIMESTAMP(3) NOT NULL,
  "recognizedAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Settlement_bookingId_key" ON "Settlement"("bookingId");
CREATE INDEX "Settlement_propertyId_idx" ON "Settlement"("propertyId");
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");
CREATE INDEX "Settlement_recognizedAt_idx" ON "Settlement"("recognizedAt");

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
