-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('BLOCKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "InclusionType" AS ENUM ('INCLUDED', 'EXCLUDED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "beds" INTEGER,
ADD COLUMN     "cancellationPolicy" "CancellationPolicy" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "checkInTime" TEXT,
ADD COLUMN     "checkOutTime" TEXT,
ADD COLUMN     "cleaningFee" DECIMAL(10,2),
ADD COLUMN     "houseRules" TEXT;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "cancellationHours" INTEGER,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "minGroupSize" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PropertyAvailability" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'BLOCKED',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourItineraryDay" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TourItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourInclusion" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "type" "InclusionType" NOT NULL,
    "item" TEXT NOT NULL,

    CONSTRAINT "TourInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourAvailability" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slotsTotal" INTEGER NOT NULL,
    "slotsBooked" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DECIMAL(5,4) NOT NULL,
    "listingType" "BookingType",
    "minBookingValue" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyAvailability_propertyId_idx" ON "PropertyAvailability"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAvailability_date_idx" ON "PropertyAvailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAvailability_propertyId_date_key" ON "PropertyAvailability"("propertyId", "date");

-- CreateIndex
CREATE INDEX "TourItineraryDay_tourId_idx" ON "TourItineraryDay"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "TourItineraryDay_tourId_dayNumber_key" ON "TourItineraryDay"("tourId", "dayNumber");

-- CreateIndex
CREATE INDEX "TourInclusion_tourId_idx" ON "TourInclusion"("tourId");

-- CreateIndex
CREATE INDEX "TourAvailability_tourId_idx" ON "TourAvailability"("tourId");

-- CreateIndex
CREATE INDEX "TourAvailability_date_idx" ON "TourAvailability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TourAvailability_tourId_date_key" ON "TourAvailability"("tourId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRedemption_bookingId_key" ON "PromotionRedemption"("bookingId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_promotionId_idx" ON "PromotionRedemption"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionRedemption_userId_idx" ON "PromotionRedemption"("userId");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_idx" ON "CommissionRule"("isActive");

-- CreateIndex
CREATE INDEX "CommissionRule_listingType_idx" ON "CommissionRule"("listingType");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PropertyAvailability" ADD CONSTRAINT "PropertyAvailability_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourItineraryDay" ADD CONSTRAINT "TourItineraryDay_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourInclusion" ADD CONSTRAINT "TourInclusion_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourAvailability" ADD CONSTRAINT "TourAvailability_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
-- Đảm bảo tính toàn vẹn: type=PROPERTY chỉ được có propertyId, type=TOUR chỉ được có tourId
ALTER TABLE "Booking" ADD CONSTRAINT "booking_type_exclusive_check"
CHECK (
  (type = 'PROPERTY' AND "propertyId" IS NOT NULL AND "tourId" IS NULL) OR
  (type = 'TOUR'     AND "tourId"     IS NOT NULL AND "propertyId" IS NULL)
);
