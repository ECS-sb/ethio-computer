-- CreateEnum
CREATE TYPE "SubscriptionCategory" AS ENUM ('VPN', 'SOCIAL', 'AI', 'STREAMING', 'CREATIVE', 'PRODUCTIVITY', 'GAMING', 'DEVELOPER', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionInfo" AS ENUM ('EMAIL', 'USERNAME', 'PHONE', 'NONE');

-- CreateEnum
CREATE TYPE "SubscriptionOrderStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletEntryType" ADD VALUE 'SUBSCRIPTION_PAYMENT';
ALTER TYPE "WalletEntryType" ADD VALUE 'SUBSCRIPTION_REFUND';

-- AlterTable
ALTER TABLE "wallet_entry" ADD COLUMN     "subscriptionOrderId" TEXT;

-- CreateTable
CREATE TABLE "subscription_service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SubscriptionCategory" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "requiredInfo" "SubscriptionInfo" NOT NULL DEFAULT 'EMAIL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "usdCents" INTEGER NOT NULL,
    "priceEtb" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "planLabel" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "accountInfo" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" "SubscriptionOrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "payMethod" TEXT NOT NULL,
    "chapaRef" TEXT,
    "deliveryNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_service_name_key" ON "subscription_service"("name");

-- CreateIndex
CREATE INDEX "subscription_service_active_category_idx" ON "subscription_service"("active", "category");

-- CreateIndex
CREATE INDEX "subscription_plan_serviceId_idx" ON "subscription_plan"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_order_chapaRef_key" ON "subscription_order"("chapaRef");

-- CreateIndex
CREATE INDEX "subscription_order_userId_createdAt_idx" ON "subscription_order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "subscription_order_status_createdAt_idx" ON "subscription_order"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_subscriptionOrderId_fkey" FOREIGN KEY ("subscriptionOrderId") REFERENCES "subscription_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan" ADD CONSTRAINT "subscription_plan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "subscription_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_order" ADD CONSTRAINT "subscription_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_order" ADD CONSTRAINT "subscription_order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

