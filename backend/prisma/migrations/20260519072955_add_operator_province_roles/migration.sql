-- CreateEnum
CREATE TYPE "ProvinceType" AS ENUM ('TINH', 'THANH_PHO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'OPERATOR_PROVINCE';
ALTER TYPE "Role" ADD VALUE 'OPERATOR_SUB';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdById" TEXT;

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ProvinceType" NOT NULL DEFAULT 'TINH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorProvinceAssignment" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "OperatorProvinceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "provinceId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reportNotes" TEXT,
    "reportResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostApprovalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "provinceId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "hostId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "provinceId" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Province_code_idx" ON "Province"("code");

-- CreateIndex
CREATE INDEX "Province_type_idx" ON "Province"("type");

-- CreateIndex
CREATE INDEX "OperatorProvinceAssignment_operatorId_idx" ON "OperatorProvinceAssignment"("operatorId");

-- CreateIndex
CREATE INDEX "OperatorProvinceAssignment_provinceId_idx" ON "OperatorProvinceAssignment"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorProvinceAssignment_provinceId_key" ON "OperatorProvinceAssignment"("provinceId");

-- CreateIndex
CREATE INDEX "OperatorTask_assignedTo_idx" ON "OperatorTask"("assignedTo");

-- CreateIndex
CREATE INDEX "OperatorTask_assignedBy_idx" ON "OperatorTask"("assignedBy");

-- CreateIndex
CREATE INDEX "OperatorTask_status_idx" ON "OperatorTask"("status");

-- CreateIndex
CREATE INDEX "OperatorTask_provinceId_idx" ON "OperatorTask"("provinceId");

-- CreateIndex
CREATE INDEX "HostApprovalRequest_userId_idx" ON "HostApprovalRequest"("userId");

-- CreateIndex
CREATE INDEX "HostApprovalRequest_status_idx" ON "HostApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "HostApprovalRequest_provinceId_idx" ON "HostApprovalRequest"("provinceId");

-- CreateIndex
CREATE INDEX "Dispute_hostId_idx" ON "Dispute"("hostId");

-- CreateIndex
CREATE INDEX "Dispute_guestId_idx" ON "Dispute"("guestId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_provinceId_idx" ON "Dispute"("provinceId");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "User"("createdById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProvinceAssignment" ADD CONSTRAINT "OperatorProvinceAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProvinceAssignment" ADD CONSTRAINT "OperatorProvinceAssignment_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorProvinceAssignment" ADD CONSTRAINT "OperatorProvinceAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorTask" ADD CONSTRAINT "OperatorTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorTask" ADD CONSTRAINT "OperatorTask_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorTask" ADD CONSTRAINT "OperatorTask_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostApprovalRequest" ADD CONSTRAINT "HostApprovalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostApprovalRequest" ADD CONSTRAINT "HostApprovalRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostApprovalRequest" ADD CONSTRAINT "HostApprovalRequest_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
