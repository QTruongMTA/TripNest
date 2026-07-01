-- Drop old PropertyRatePlan table (stub with limited fields)
DROP TABLE IF EXISTS "PropertyRatePlan";

-- Drop and recreate RatePlanType enum with new values
DROP TYPE IF EXISTS "RatePlanType";
CREATE TYPE "RatePlanType" AS ENUM ('STANDARD', 'NON_REFUNDABLE', 'WEEKLY', 'MONTHLY');

-- New PriceAdjustmentType enum
CREATE TYPE "PriceAdjustmentType" AS ENUM ('NONE', 'PERCENT', 'FIXED');

-- Recreate PropertyRatePlan with full schema
CREATE TABLE "PropertyRatePlan" (
    "id"                   TEXT NOT NULL,
    "propertyId"           TEXT NOT NULL,
    "name"                 TEXT NOT NULL,
    "type"                 "RatePlanType" NOT NULL DEFAULT 'STANDARD',
    "isActive"             BOOLEAN NOT NULL DEFAULT true,
    "priceAdjustmentType"  "PriceAdjustmentType" NOT NULL DEFAULT 'NONE',
    "priceAdjustmentValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cancellationPolicy"   "CancellationPolicy",
    "cancellationFreeDays" INTEGER,
    "minStay"              INTEGER,
    "maxStay"              INTEGER,
    "breakfastIncluded"    BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"            INTEGER NOT NULL DEFAULT 0,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyRatePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyRatePlan_propertyId_idx" ON "PropertyRatePlan"("propertyId");

ALTER TABLE "PropertyRatePlan" ADD CONSTRAINT "PropertyRatePlan_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add ratePlanId to Booking
ALTER TABLE "Booking" ADD COLUMN "ratePlanId" TEXT;

CREATE INDEX "Booking_ratePlanId_idx" ON "Booking"("ratePlanId");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ratePlanId_fkey"
    FOREIGN KEY ("ratePlanId") REFERENCES "PropertyRatePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
