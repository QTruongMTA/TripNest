-- CreateTable
CREATE TABLE "SettlementRun" (
  "id" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY_FOR_PAYOUT',
  "generatedBy" TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "summary" JSONB,
  "charts" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SettlementRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementHost" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "hostName" TEXT NOT NULL,
  "hostEmail" TEXT,
  "period" TEXT NOT NULL,
  "bookingCount" INTEGER NOT NULL DEFAULT 0,
  "grossAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "disputeCount" INTEGER NOT NULL DEFAULT 0,
  "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "hostPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commissionReceivable" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'READY_FOR_PAYOUT',
  "paidAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SettlementHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementBooking" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "settlementHostId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "hostName" TEXT NOT NULL,
  "hostEmail" TEXT,
  "guest" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "property" TEXT NOT NULL,
  "province" TEXT NOT NULL,
  "propertyType" TEXT NOT NULL,
  "checkIn" TEXT,
  "checkOut" TEXT,
  "createdAtSnapshot" TIMESTAMP(3) NOT NULL,
  "settlementPeriod" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "settlementBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "penaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commissionRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transferReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "hostDirectReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "hostPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commissionReceivable" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "bookingStatus" TEXT NOT NULL,
  "refundStatus" TEXT,
  "refundedAt" TIMESTAMP(3),
  "paymentMethod" TEXT,
  "paymentMethodLabel" TEXT NOT NULL,
  "paymentModel" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "payoutStatus" TEXT NOT NULL,
  "disputeStatus" TEXT,
  "disputeSubject" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutTransaction" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "settlementHostId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "bookingCount" INTEGER NOT NULL DEFAULT 0,
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commissionReceivable" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "paidAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "referenceCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRun_period_key" ON "SettlementRun"("period");
CREATE INDEX "SettlementRun_period_idx" ON "SettlementRun"("period");
CREATE INDEX "SettlementRun_status_idx" ON "SettlementRun"("status");
CREATE UNIQUE INDEX "SettlementHost_settlementId_hostId_key" ON "SettlementHost"("settlementId", "hostId");
CREATE INDEX "SettlementHost_hostId_idx" ON "SettlementHost"("hostId");
CREATE INDEX "SettlementHost_period_idx" ON "SettlementHost"("period");
CREATE INDEX "SettlementHost_status_idx" ON "SettlementHost"("status");
CREATE UNIQUE INDEX "SettlementBooking_settlementId_bookingId_key" ON "SettlementBooking"("settlementId", "bookingId");
CREATE INDEX "SettlementBooking_settlementHostId_idx" ON "SettlementBooking"("settlementHostId");
CREATE INDEX "SettlementBooking_bookingId_idx" ON "SettlementBooking"("bookingId");
CREATE INDEX "SettlementBooking_hostId_idx" ON "SettlementBooking"("hostId");
CREATE INDEX "SettlementBooking_settlementPeriod_idx" ON "SettlementBooking"("settlementPeriod");
CREATE INDEX "SettlementBooking_payoutStatus_idx" ON "SettlementBooking"("payoutStatus");
CREATE UNIQUE INDEX "PayoutTransaction_settlementHostId_key" ON "PayoutTransaction"("settlementHostId");
CREATE INDEX "PayoutTransaction_settlementId_idx" ON "PayoutTransaction"("settlementId");
CREATE INDEX "PayoutTransaction_hostId_idx" ON "PayoutTransaction"("hostId");
CREATE INDEX "PayoutTransaction_period_idx" ON "PayoutTransaction"("period");
CREATE INDEX "PayoutTransaction_status_idx" ON "PayoutTransaction"("status");

-- AddForeignKey
ALTER TABLE "SettlementHost" ADD CONSTRAINT "SettlementHost_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SettlementRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementBooking" ADD CONSTRAINT "SettlementBooking_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SettlementRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementBooking" ADD CONSTRAINT "SettlementBooking_settlementHostId_fkey" FOREIGN KEY ("settlementHostId") REFERENCES "SettlementHost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementBooking" ADD CONSTRAINT "SettlementBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SettlementRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_settlementHostId_fkey" FOREIGN KEY ("settlementHostId") REFERENCES "SettlementHost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
