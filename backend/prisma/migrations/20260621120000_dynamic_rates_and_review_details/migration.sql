CREATE TABLE "PropertyDailyRate" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDailyRate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Review"
ADD COLUMN "cleanlinessRating" INTEGER,
ADD COLUMN "locationRating" INTEGER,
ADD COLUMN "serviceRating" INTEGER,
ADD COLUMN "valueRating" INTEGER,
ADD COLUMN "hostResponse" TEXT,
ADD COLUMN "hostRespondedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "PropertyDailyRate_propertyId_date_key"
ON "PropertyDailyRate"("propertyId", "date");

CREATE INDEX "PropertyDailyRate_propertyId_idx"
ON "PropertyDailyRate"("propertyId");

CREATE INDEX "PropertyDailyRate_date_idx"
ON "PropertyDailyRate"("date");

ALTER TABLE "PropertyDailyRate"
ADD CONSTRAINT "PropertyDailyRate_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
