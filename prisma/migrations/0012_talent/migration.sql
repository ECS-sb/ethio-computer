-- CreateEnum
CREATE TYPE "GigCategory" AS ENUM ('VOICE_OVER', 'THUMBNAIL', 'VIDEO_EDITING', 'AI_VIDEO');

-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'DECLINED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletEntryType" ADD VALUE 'JOB_PAYMENT';
ALTER TYPE "WalletEntryType" ADD VALUE 'JOB_REFUND';
ALTER TYPE "WalletEntryType" ADD VALUE 'JOB_EARNING';

-- AlterTable
ALTER TABLE "wallet_entry" ADD COLUMN     "jobId" TEXT;

-- CreateTable
CREATE TABLE "gig" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "category" "GigCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceEtb" INTEGER NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "portfolioLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GigStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_sample" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "data" BYTEA NOT NULL,
    "thumb" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gig_sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_thread" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gig_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "brief" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'REQUESTED',
    "feePercent" INTEGER NOT NULL,
    "feeEtb" INTEGER,
    "payoutEtb" INTEGER,
    "dueAt" TIMESTAMP(3),
    "deliveryNote" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_file" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_review" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gig_status_category_idx" ON "gig"("status", "category");

-- CreateIndex
CREATE INDEX "gig_freelancerId_idx" ON "gig"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "gig_sample_gigId_position_key" ON "gig_sample"("gigId", "position");

-- CreateIndex
CREATE INDEX "gig_thread_clientId_idx" ON "gig_thread"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "gig_thread_gigId_clientId_key" ON "gig_thread"("gigId", "clientId");

-- CreateIndex
CREATE INDEX "gig_message_threadId_createdAt_idx" ON "gig_message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "job_clientId_idx" ON "job"("clientId");

-- CreateIndex
CREATE INDEX "job_freelancerId_idx" ON "job"("freelancerId");

-- CreateIndex
CREATE INDEX "job_status_idx" ON "job"("status");

-- CreateIndex
CREATE INDEX "job_threadId_idx" ON "job"("threadId");

-- CreateIndex
CREATE INDEX "job_file_jobId_idx" ON "job_file"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "job_review_jobId_key" ON "job_review"("jobId");

-- CreateIndex
CREATE INDEX "job_review_gigId_idx" ON "job_review"("gigId");

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig" ADD CONSTRAINT "gig_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_sample" ADD CONSTRAINT "gig_sample_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_thread" ADD CONSTRAINT "gig_thread_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_thread" ADD CONSTRAINT "gig_thread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_message" ADD CONSTRAINT "gig_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "gig_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_message" ADD CONSTRAINT "gig_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "gig_thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_file" ADD CONSTRAINT "job_file_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_review" ADD CONSTRAINT "job_review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ደረጃው 1-5 ብቻ፣ የስራው ዋጋ ከዜሮ በላይ
ALTER TABLE "job_review" ADD CONSTRAINT "job_review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "job" ADD CONSTRAINT "job_amount_check" CHECK ("amountEtb" > 0);
