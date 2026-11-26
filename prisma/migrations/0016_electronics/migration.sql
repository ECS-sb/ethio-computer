-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PHONE', 'LAPTOP', 'TABLET', 'COMPUTER', 'TV_AUDIO', 'GAMING', 'CAMERA', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'LIKE_NEW', 'USED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "ProductOrderStatus" AS ENUM ('PAID', 'HANDED_OVER', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletEntryType" ADD VALUE 'PRODUCT_PAYMENT';
ALTER TYPE "WalletEntryType" ADD VALUE 'PRODUCT_REFUND';
ALTER TYPE "WalletEntryType" ADD VALUE 'PRODUCT_EARNING';

-- AlterTable
ALTER TABLE "wallet_entry" ADD COLUMN     "productOrderId" TEXT;

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "priceEtb" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "thumb" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_thread" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_order" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "feePercent" INTEGER NOT NULL,
    "feeEtb" INTEGER,
    "payoutEtb" INTEGER,
    "status" "ProductOrderStatus" NOT NULL DEFAULT 'PAID',
    "handedOverAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_status_category_idx" ON "product"("status", "category");

-- CreateIndex
CREATE INDEX "product_sellerId_idx" ON "product"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "product_image_productId_position_key" ON "product_image"("productId", "position");

-- CreateIndex
CREATE INDEX "product_thread_buyerId_idx" ON "product_thread"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "product_thread_productId_buyerId_key" ON "product_thread"("productId", "buyerId");

-- CreateIndex
CREATE INDEX "product_message_threadId_createdAt_idx" ON "product_message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "product_order_buyerId_idx" ON "product_order"("buyerId");

-- CreateIndex
CREATE INDEX "product_order_sellerId_idx" ON "product_order"("sellerId");

-- CreateIndex
CREATE INDEX "product_order_status_idx" ON "product_order"("status");

-- CreateIndex
CREATE INDEX "product_order_threadId_idx" ON "product_order"("threadId");

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_productOrderId_fkey" FOREIGN KEY ("productOrderId") REFERENCES "product_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_thread" ADD CONSTRAINT "product_thread_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_thread" ADD CONSTRAINT "product_thread_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_message" ADD CONSTRAINT "product_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "product_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_message" ADD CONSTRAINT "product_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order" ADD CONSTRAINT "product_order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order" ADD CONSTRAINT "product_order_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "product_thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order" ADD CONSTRAINT "product_order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_order" ADD CONSTRAINT "product_order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

