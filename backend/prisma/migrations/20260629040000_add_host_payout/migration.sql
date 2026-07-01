-- Add refundedAt to Payment for accurate month-based refund reporting
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

-- Add PayoutStatus enum
DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'READY', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add HostPayout table
CREATE TABLE IF NOT EXISTS "HostPayout" (
  "id"             TEXT          NOT NULL,
  "hostId"         TEXT          NOT NULL,
  "month"          TEXT          NOT NULL,
  "totalRevenue"   DECIMAL(12,2) NOT NULL,
  "commission"     DECIMAL(12,2) NOT NULL,
  "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netPayout"      DECIMAL(12,2) NOT NULL,
  "status"         "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"         TIMESTAMP(3),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HostPayout_hostId_month_key" ON "HostPayout"("hostId", "month");
CREATE INDEX IF NOT EXISTS "HostPayout_hostId_idx" ON "HostPayout"("hostId");
CREATE INDEX IF NOT EXISTS "HostPayout_status_idx" ON "HostPayout"("status");

ALTER TABLE "HostPayout"
  DROP CONSTRAINT IF EXISTS "HostPayout_hostId_fkey";

ALTER TABLE "HostPayout"
  ADD CONSTRAINT "HostPayout_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
