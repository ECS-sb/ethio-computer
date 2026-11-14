-- CreateEnum
CREATE TYPE "TelegramChannelStatus" AS ENUM ('NEGOTIATING', 'AGREED', 'PAID', 'DELIVERED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "telegram_channel" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "key" TEXT,
    "link" TEXT,
    "title" TEXT NOT NULL,
    "sellerChatId" TEXT,
    "purchasePrice" INTEGER,
    "paidToSellerEtb" INTEGER,
    "sourceStatus" "TelegramChannelStatus",
    "buyerChatId" TEXT,
    "salePrice" INTEGER,
    "buyerPaidEtb" INTEGER,
    "refundedEtb" INTEGER NOT NULL DEFAULT 0,
    "saleStatus" "TelegramChannelStatus",
    "soldAt" TIMESTAMP(3),
    "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_channel_key_key" ON "telegram_channel"("key");

-- CreateIndex
CREATE INDEX "telegram_channel_sellerChatId_idx" ON "telegram_channel"("sellerChatId");

-- CreateIndex
CREATE INDEX "telegram_channel_buyerChatId_idx" ON "telegram_channel"("buyerChatId");

-- CreateIndex
CREATE INDEX "telegram_channel_soldAt_idx" ON "telegram_channel"("soldAt");

-- AddForeignKey
ALTER TABLE "telegram_channel" ADD CONSTRAINT "telegram_channel_sellerChatId_fkey" FOREIGN KEY ("sellerChatId") REFERENCES "telegram_chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_channel" ADD CONSTRAINT "telegram_channel_buyerChatId_fkey" FOREIGN KEY ("buyerChatId") REFERENCES "telegram_chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

