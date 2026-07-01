-- CreateTable
CREATE TABLE "PropertyDailyRate" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2),
    "minStay" INTEGER,
    "maxStay" INTEGER,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDailyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyDailyRate_propertyId_date_key" ON "PropertyDailyRate"("propertyId", "date");
CREATE INDEX "PropertyDailyRate_propertyId_idx" ON "PropertyDailyRate"("propertyId");
CREATE INDEX "PropertyDailyRate_date_idx" ON "PropertyDailyRate"("date");

-- AddForeignKey
ALTER TABLE "PropertyDailyRate" ADD CONSTRAINT "PropertyDailyRate_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
