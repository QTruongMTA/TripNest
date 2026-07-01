ALTER TABLE "Promotion"
ADD COLUMN IF NOT EXISTS "hostId" TEXT,
ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

CREATE INDEX IF NOT EXISTS "Promotion_hostId_idx" ON "Promotion"("hostId");
CREATE INDEX IF NOT EXISTS "Promotion_propertyId_idx" ON "Promotion"("propertyId");

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
