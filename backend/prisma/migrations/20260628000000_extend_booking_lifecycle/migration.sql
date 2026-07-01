-- AlterEnum: BookingStatus — add granular cancellation + lifecycle statuses
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED_BY_GUEST';
ALTER TYPE "BookingStatus" ADD VALUE 'CANCELLED_BY_HOST';
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterEnum: PaymentStatus — add payment-flow statuses
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterEnum: NotificationType — add lifecycle notification types
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_NO_SHOW';

-- AlterTable: Booking — add lifecycle timestamps and cancellation reason
ALTER TABLE "Booking"
  ADD COLUMN "expiresAt"       TIMESTAMP(3),
  ADD COLUMN "cancelledAt"     TIMESTAMP(3),
  ADD COLUMN "cancelledReason" TEXT;

-- AlterTable: Payment — add refund tracking and failure info
ALTER TABLE "Payment"
  ADD COLUMN "refundAmount" DECIMAL(10,2),
  ADD COLUMN "failedAt"     TIMESTAMP(3);
