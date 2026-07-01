-- Remove legacy tour business domain. Existing tour bookings and tour catalog data are intentionally discarded.

DELETE FROM "Booking"
WHERE "type" = 'TOUR';

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_tourId_fkey";

DROP INDEX IF EXISTS "Booking_tourId_idx";
DROP INDEX IF EXISTS "TourAvailability_date_idx";
DROP INDEX IF EXISTS "TourAvailability_tourId_idx";
DROP INDEX IF EXISTS "TourAvailability_tourId_date_key";
DROP INDEX IF EXISTS "TourImage_tourId_primary_key";
DROP INDEX IF EXISTS "TourInclusion_tourId_idx";
DROP INDEX IF EXISTS "TourItineraryDay_tourId_idx";
DROP INDEX IF EXISTS "TourItineraryDay_tourId_dayNumber_key";
DROP INDEX IF EXISTS "Tour_category_idx";
DROP INDEX IF EXISTS "Tour_city_idx";
DROP INDEX IF EXISTS "Tour_hostId_idx";
DROP INDEX IF EXISTS "Tour_status_idx";

DROP TABLE IF EXISTS "TourAvailability";
DROP TABLE IF EXISTS "TourInclusion";
DROP TABLE IF EXISTS "TourItineraryDay";
DROP TABLE IF EXISTS "TourImage";
DROP TABLE IF EXISTS "Tour";

ALTER TABLE "Booking" DROP COLUMN IF EXISTS "tourId";
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "tourDate";

DELETE FROM "CommissionRule"
WHERE "listingType" = 'TOUR';

ALTER TYPE "BookingType" RENAME TO "BookingType_old";
CREATE TYPE "BookingType" AS ENUM ('PROPERTY');

ALTER TABLE "Booking"
  ALTER COLUMN "type" TYPE "BookingType"
  USING "type"::text::"BookingType";

ALTER TABLE "CommissionRule"
  ALTER COLUMN "listingType" TYPE "BookingType"
  USING "listingType"::text::"BookingType";

DROP TYPE "BookingType_old";
DROP TYPE IF EXISTS "TourCategory";
