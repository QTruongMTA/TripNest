ALTER TABLE "Dispute"
  ADD COLUMN "reporter" TEXT NOT NULL DEFAULT 'TRAVELER',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "requestedOutcome" TEXT,
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "operatorNotes" JSONB,
  ADD COLUMN "refundAdjustment" DECIMAL(10, 2),
  ADD COLUMN "payoutAdjustment" DECIMAL(10, 2),
  ADD COLUMN "decision" TEXT;

CREATE INDEX "Dispute_category_idx" ON "Dispute"("category");
CREATE INDEX "Dispute_severity_idx" ON "Dispute"("severity");
