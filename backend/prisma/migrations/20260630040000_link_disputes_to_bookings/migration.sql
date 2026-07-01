CREATE INDEX IF NOT EXISTS "Dispute_bookingId_idx" ON "Dispute"("bookingId");

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
