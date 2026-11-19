-- CreateEnum
CREATE TYPE "TelegramAccountCategory" AS ENUM ('SALES', 'SCHOOL');

-- AlterTable
ALTER TABLE "telegram_connection" ADD COLUMN "category" "TelegramAccountCategory" NOT NULL DEFAULT 'SALES';
