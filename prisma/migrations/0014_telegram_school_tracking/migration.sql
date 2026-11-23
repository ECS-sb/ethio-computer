-- CreateEnum
CREATE TYPE "TelegramStaffSource" AS ENUM ('WEB', 'SIGNATURE', 'CHAT_OWNER', 'SHIFT');

-- AlterTable
ALTER TABLE "telegram_staff" ADD COLUMN "signature" TEXT,
ADD COLUMN "shiftStart" INTEGER,
ADD COLUMN "shiftEnd" INTEGER;

-- AlterTable
ALTER TABLE "telegram_chat" ADD COLUMN "ownerStaffId" TEXT,
ADD COLUMN "ownerManual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "telegram_message" ADD COLUMN "staffId" TEXT,
ADD COLUMN "staffSource" "TelegramStaffSource",
ADD COLUMN "broadcastId" TEXT;

-- CreateTable
CREATE TABLE "telegram_broadcast" (
    "id" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "recipientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "telegram_broadcast_createdAt_idx" ON "telegram_broadcast"("createdAt");

-- CreateIndex
CREATE INDEX "telegram_chat_ownerStaffId_idx" ON "telegram_chat"("ownerStaffId");

-- CreateIndex
CREATE INDEX "telegram_message_staffId_sentAt_idx" ON "telegram_message"("staffId", "sentAt");

-- AddForeignKey
ALTER TABLE "telegram_chat" ADD CONSTRAINT "telegram_chat_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "telegram_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_message" ADD CONSTRAINT "telegram_message_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "telegram_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
