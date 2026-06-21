ALTER TABLE "Booking"
ADD COLUMN "stayPrice" DECIMAL(10,2),
ADD COLUMN "extrasPrice" DECIMAL(10,2),
ADD COLUMN "serviceFee" DECIMAL(10,2),
ADD COLUMN "vatAmount" DECIMAL(10,2),
ADD COLUMN "discountAmount" DECIMAL(10,2),
ADD COLUMN "selectedServices" JSONB,
ADD COLUMN "pricingBreakdown" JSONB;
