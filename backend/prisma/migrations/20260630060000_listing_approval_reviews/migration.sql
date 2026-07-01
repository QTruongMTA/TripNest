CREATE TABLE "ListingApprovalReview" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" "ApprovalStatus" NOT NULL,
  "checklist" JSONB,
  "issues" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ListingApprovalReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingApprovalReview_propertyId_idx" ON "ListingApprovalReview"("propertyId");
CREATE INDEX "ListingApprovalReview_reviewerId_idx" ON "ListingApprovalReview"("reviewerId");
CREATE INDEX "ListingApprovalReview_decision_idx" ON "ListingApprovalReview"("decision");
CREATE INDEX "ListingApprovalReview_createdAt_idx" ON "ListingApprovalReview"("createdAt");

ALTER TABLE "ListingApprovalReview"
ADD CONSTRAINT "ListingApprovalReview_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ListingApprovalReview"
ADD CONSTRAINT "ListingApprovalReview_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
