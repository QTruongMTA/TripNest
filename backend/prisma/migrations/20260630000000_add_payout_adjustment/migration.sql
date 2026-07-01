-- Add adjustment fields to HostPayout for admin manual correction
ALTER TABLE "HostPayout" ADD COLUMN IF NOT EXISTS "adjustmentAmount" DECIMAL(12,2);
ALTER TABLE "HostPayout" ADD COLUMN IF NOT EXISTS "adjustmentReason" TEXT;
