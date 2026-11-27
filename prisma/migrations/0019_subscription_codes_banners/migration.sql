-- CreateEnum
CREATE TYPE "SubscriptionDelivery" AS ENUM ('CODE', 'ACCOUNT');

-- AlterTable
ALTER TABLE "subscription_service" ADD COLUMN     "delivery" "SubscriptionDelivery" NOT NULL DEFAULT 'ACCOUNT',
ADD COLUMN     "discountEndsAt" TIMESTAMP(3),
ADD COLUMN     "discountEtb" INTEGER,
ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "logo" BYTEA,
ADD COLUMN     "profitEtb" INTEGER;

-- CreateTable
CREATE TABLE "subscription_code" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAm" TEXT NOT NULL,
    "textEn" TEXT NOT NULL DEFAULT '',
    "textAm" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT,
    "linkLabelEn" TEXT NOT NULL DEFAULT '',
    "linkLabelAm" TEXT NOT NULL DEFAULT '',
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_code_orderId_key" ON "subscription_code"("orderId");

-- CreateIndex
CREATE INDEX "subscription_code_planId_orderId_idx" ON "subscription_code"("planId", "orderId");

-- CreateIndex
CREATE INDEX "banner_active_startsAt_idx" ON "banner"("active", "startsAt");

-- AddForeignKey
ALTER TABLE "subscription_code" ADD CONSTRAINT "subscription_code_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_code" ADD CONSTRAINT "subscription_code_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "subscription_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- በስጦታ ኮድ/ቫውቸር የሚሸጡት (ኮድ ሲኖር ደንበኛው ወዲያው ያገኛል)፤ ሌሎቹ በደንበኛው አካውንት ላይ በሰው ይገባሉ።
UPDATE "subscription_service" SET "delivery" = 'CODE' WHERE "name" IN ('Telegram Premium', 'Discord Nitro', 'Netflix', 'Spotify Premium', 'Apple Music', 'iCloud+', 'PlayStation Plus', 'Xbox Game Pass Ultimate', 'Surfshark VPN', 'NordVPN', 'Google One');
