ALTER TABLE "Review"
  ADD COLUMN "cleanlinessRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "comfortRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "locationRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "amenitiesRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "valueRating" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "images" JSONB,
  ADD COLUMN "revisionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastEditedAt" TIMESTAMP(3),
  ADD COLUMN "operatorFlaggedAt" TIMESTAMP(3),
  ADD COLUMN "adminReportedAt" TIMESTAMP(3),
  ADD COLUMN "adminReportNote" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Review_rating_idx" ON "Review"("rating");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");
