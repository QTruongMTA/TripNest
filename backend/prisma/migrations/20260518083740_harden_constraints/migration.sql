-- ─── Prisma-generated diff ────────────────────────────────────────────────────

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_tourId_fkey";

-- DropIndex
DROP INDEX "Review_propertyId_idx";

-- DropIndex
DROP INDEX "Review_tourId_idx";

-- AlterTable: xóa cột denormalized khỏi Review — suy ra qua booking
ALTER TABLE "Review" DROP COLUMN "propertyId",
DROP COLUMN "tourId";

-- AlterTable: đồng nhất Tour.cancellationPolicy với enum CancellationPolicy (bỏ String?)
ALTER TABLE "Tour" DROP COLUMN "cancellationPolicy",
ADD COLUMN "cancellationPolicy" "CancellationPolicy";

-- CreateIndex: ngăn cùng user dùng lại cùng promotion ở nhiều booking
CREATE UNIQUE INDEX "PromotionRedemption_promotionId_userId_key"
  ON "PromotionRedemption"("promotionId", "userId");

-- ─── Custom constraints (không thể biểu diễn qua Prisma DSL) ─────────────────

-- Booking: ràng buộc ngày tháng và numGuests theo từng loại booking
-- Đảm bảo: PROPERTY phải có checkIn/checkOut (không có tourDate), TOUR ngược lại
-- checkOut phải sau checkIn, numGuests > 0
ALTER TABLE "Booking" ADD CONSTRAINT "booking_dates_check"
CHECK (
  (
    type = 'PROPERTY'
    AND "checkIn"  IS NOT NULL
    AND "checkOut" IS NOT NULL
    AND "tourDate" IS NULL
    AND "checkOut" > "checkIn"
  ) OR (
    type = 'TOUR'
    AND "tourDate" IS NOT NULL
    AND "checkIn"  IS NULL
    AND "checkOut" IS NULL
  )
);

ALTER TABLE "Booking" ADD CONSTRAINT "booking_num_guests_check"
CHECK ("numGuests" > 0);

-- TourAvailability: bảo vệ tính hợp lệ của dữ liệu slot
ALTER TABLE "TourAvailability" ADD CONSTRAINT "tour_availability_slots_check"
CHECK (
  "slotsTotal"  >  0
  AND "slotsBooked" >= 0
  AND "slotsBooked" <= "slotsTotal"
);

-- PropertyImage: tối đa 1 ảnh primary mỗi property (partial unique index)
CREATE UNIQUE INDEX "PropertyImage_propertyId_primary_key"
  ON "PropertyImage" ("propertyId")
  WHERE "isPrimary" = true;

-- TourImage: tối đa 1 ảnh primary mỗi tour (partial unique index)
CREATE UNIQUE INDEX "TourImage_tourId_primary_key"
  ON "TourImage" ("tourId")
  WHERE "isPrimary" = true;

-- Review.rating: bắt buộc trong khoảng 1–5
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range_check"
CHECK ("rating" >= 1 AND "rating" <= 5);

-- CommissionRule.rate: tỷ lệ hoa hồng phải trong khoảng 0–1 (0% đến 100%)
ALTER TABLE "CommissionRule" ADD CONSTRAINT "commission_rate_range_check"
CHECK ("rate" >= 0 AND "rate" <= 1);
