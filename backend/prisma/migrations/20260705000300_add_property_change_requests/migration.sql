CREATE TABLE "PropertyChangeRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "provinceId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentValues" JSONB NOT NULL,
    "requestedValues" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "documents" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyChangeRequest_propertyId_idx" ON "PropertyChangeRequest"("propertyId");
CREATE INDEX "PropertyChangeRequest_hostId_idx" ON "PropertyChangeRequest"("hostId");
CREATE INDEX "PropertyChangeRequest_provinceId_idx" ON "PropertyChangeRequest"("provinceId");
CREATE INDEX "PropertyChangeRequest_status_idx" ON "PropertyChangeRequest"("status");

ALTER TABLE "PropertyChangeRequest"
ADD CONSTRAINT "PropertyChangeRequest_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyChangeRequest"
ADD CONSTRAINT "PropertyChangeRequest_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyChangeRequest"
ADD CONSTRAINT "PropertyChangeRequest_provinceId_fkey"
FOREIGN KEY ("provinceId") REFERENCES "Province"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PropertyChangeRequest"
ADD CONSTRAINT "PropertyChangeRequest_reviewedBy_fkey"
FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
