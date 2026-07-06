ALTER TABLE "Booking" ADD COLUMN "cancellationRefundAmount" DECIMAL(10, 2);
ALTER TABLE "Booking" ADD COLUMN "cancellationPenaltyAmount" DECIMAL(10, 2);
ALTER TABLE "Booking" ADD COLUMN "refundStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN "refundedAt" TIMESTAMP(3);
