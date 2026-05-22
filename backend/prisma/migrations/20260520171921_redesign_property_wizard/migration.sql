-- New enums

CREATE TYPE "BookingMethod" AS ENUM ('INSTANT', 'REQUEST');
CREATE TYPE "PetPolicy" AS ENUM ('ALLOWED', 'ON_REQUEST', 'NOT_ALLOWED');
CREATE TYPE "ParkingType" AS ENUM ('FREE', 'PAID', 'NOT_AVAILABLE');
CREATE TYPE "LegalEntityType" AS ENUM ('INDIVIDUAL', 'BUSINESS');
CREATE TYPE "RatePlanType" AS ENUM ('NON_REFUNDABLE', 'WEEKLY');

-- Add UNIQUE to PropertyType enum
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'UNIQUE';

-- Step 1: Add new nullable columns to Property

ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "addressLine1"       TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine2"       TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode"         TEXT,
  ADD COLUMN IF NOT EXISTS "bedroomCount"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "livingRoomSofaBeds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "childrenAllowed"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "cribsAvailable"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sizeM2"             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "launchDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "commission"         DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS "bookingMethod"      "BookingMethod" NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN IF NOT EXISTS "cancellationFreeDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "mistakeProtection"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "breakfastIncluded"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "parkingType"        "ParkingType" NOT NULL DEFAULT 'NOT_AVAILABLE',
  ADD COLUMN IF NOT EXISTS "smokingAllowed"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "partiesAllowed"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "petsPolicy"         "PetPolicy" NOT NULL DEFAULT 'NOT_ALLOWED',
  ADD COLUMN IF NOT EXISTS "checkInFrom"        TEXT,
  ADD COLUMN IF NOT EXISTS "checkInTo"          TEXT,
  ADD COLUMN IF NOT EXISTS "checkOutFrom"       TEXT,
  ADD COLUMN IF NOT EXISTS "checkOutTo"         TEXT,
  ADD COLUMN IF NOT EXISTS "groupPricingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "oneGuestDiscountPct" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "availabilityWindow" INTEGER NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS "longStayAllowed"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "maxStayNights"      INTEGER,
  ADD COLUMN IF NOT EXISTS "legalEntityType"    "LegalEntityType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS "ownerAlias"         TEXT;

-- Step 2: Migrate existing data

-- Copy old address to addressLine1
UPDATE "Property" SET "addressLine1" = "address" WHERE "addressLine1" IS NULL;

-- Copy checkInTime to checkInFrom, checkOutTime to checkOutTo
UPDATE "Property" SET
  "checkInFrom"  = "checkInTime",
  "checkOutTo"   = "checkOutTime",
  "bedroomCount" = "bedrooms"
WHERE "checkInFrom" IS NULL;

-- Step 3: Make addressLine1 NOT NULL

ALTER TABLE "Property" ALTER COLUMN "addressLine1" SET NOT NULL;

-- Step 4: Drop old columns

ALTER TABLE "Property"
  DROP COLUMN IF EXISTS "address",
  DROP COLUMN IF EXISTS "beds",
  DROP COLUMN IF EXISTS "bedrooms",
  DROP COLUMN IF EXISTS "checkInTime",
  DROP COLUMN IF EXISTS "checkOutTime",
  DROP COLUMN IF EXISTS "houseRules";

-- Step 5: Create new tables

-- PropertyBedroom
CREATE TABLE "PropertyBedroom" (
  "id"            TEXT NOT NULL,
  "propertyId"    TEXT NOT NULL,
  "roomNumber"    INTEGER NOT NULL,
  "singleBeds"    INTEGER NOT NULL DEFAULT 0,
  "doubleBeds"    INTEGER NOT NULL DEFAULT 0,
  "kingBeds"      INTEGER NOT NULL DEFAULT 0,
  "superKingBeds" INTEGER NOT NULL DEFAULT 0,
  "bunkBeds"      INTEGER NOT NULL DEFAULT 0,
  "sofaBeds"      INTEGER NOT NULL DEFAULT 0,
  "futonBeds"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PropertyBedroom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyBedroom_propertyId_roomNumber_key"
  ON "PropertyBedroom"("propertyId", "roomNumber");

CREATE INDEX "PropertyBedroom_propertyId_idx"
  ON "PropertyBedroom"("propertyId");

ALTER TABLE "PropertyBedroom"
  ADD CONSTRAINT "PropertyBedroom_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE;

-- PropertyLanguage
CREATE TABLE "PropertyLanguage" (
  "id"         TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "language"   TEXT NOT NULL,
  CONSTRAINT "PropertyLanguage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyLanguage_propertyId_language_key"
  ON "PropertyLanguage"("propertyId", "language");

CREATE INDEX "PropertyLanguage_propertyId_idx"
  ON "PropertyLanguage"("propertyId");

ALTER TABLE "PropertyLanguage"
  ADD CONSTRAINT "PropertyLanguage_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE;

-- PropertyRatePlan
CREATE TABLE "PropertyRatePlan" (
  "id"          TEXT NOT NULL,
  "propertyId"  TEXT NOT NULL,
  "type"        "RatePlanType" NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "discountPct" INTEGER NOT NULL,
  CONSTRAINT "PropertyRatePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyRatePlan_propertyId_type_key"
  ON "PropertyRatePlan"("propertyId", "type");

CREATE INDEX "PropertyRatePlan_propertyId_idx"
  ON "PropertyRatePlan"("propertyId");

ALTER TABLE "PropertyRatePlan"
  ADD CONSTRAINT "PropertyRatePlan_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE;

-- PropertyChildPricing
CREATE TABLE "PropertyChildPricing" (
  "id"          TEXT NOT NULL,
  "propertyId"  TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "infantFree"  BOOLEAN NOT NULL DEFAULT true,
  "infantPrice" DECIMAL(10,2),
  "childMaxAge" INTEGER NOT NULL DEFAULT 17,
  "childFree"   BOOLEAN NOT NULL DEFAULT true,
  "childPrice"  DECIMAL(10,2),
  CONSTRAINT "PropertyChildPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyChildPricing_propertyId_key"
  ON "PropertyChildPricing"("propertyId");

ALTER TABLE "PropertyChildPricing"
  ADD CONSTRAINT "PropertyChildPricing_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE;

-- PropertyOwner
CREATE TABLE "PropertyOwner" (
  "id"         TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "firstName"  TEXT NOT NULL,
  "lastName"   TEXT NOT NULL,
  "birthDate"  DATE NOT NULL,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyOwner_propertyId_idx"
  ON "PropertyOwner"("propertyId");

ALTER TABLE "PropertyOwner"
  ADD CONSTRAINT "PropertyOwner_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE;
