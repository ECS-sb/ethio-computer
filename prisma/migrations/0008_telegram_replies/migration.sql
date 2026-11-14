-- AlterTable
ALTER TABLE "telegram_chat" ADD COLUMN     "suggestedAt" TIMESTAMP(3),
ADD COLUMN     "suggestedForMessageId" TEXT,
ADD COLUMN     "suggestedReply" TEXT;

-- AlterTable
ALTER TABLE "telegram_message" ADD COLUMN     "relayedFromId" TEXT,
ADD COLUMN     "sentByName" TEXT,
ADD COLUMN     "sentByUserId" TEXT;

