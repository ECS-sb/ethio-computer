-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "WhatsAppSource" AS ENUM ('CUSTOMER', 'AUTO', 'STAFF', 'PHONE');

-- CreateTable
CREATE TABLE "whatsapp_chat" (
    "id" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "lastDirection" "WhatsAppDirection" NOT NULL,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "welcomedAt" TIMESTAMP(3),
    "needsHuman" BOOLEAN NOT NULL DEFAULT false,
    "adSourceId" TEXT,
    "adHeadline" TEXT,
    "referral" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "waMessageId" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "source" "WhatsAppSource" NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "replyId" TEXT,
    "mediaId" TEXT,
    "mimeType" TEXT,
    "status" TEXT,
    "errorText" TEXT,
    "sentByUserId" TEXT,
    "sentByName" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chat_waId_key" ON "whatsapp_chat"("waId");

-- CreateIndex
CREATE INDEX "whatsapp_chat_lastMessageAt_idx" ON "whatsapp_chat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_chat_adSourceId_idx" ON "whatsapp_chat"("adSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_waMessageId_key" ON "whatsapp_message"("waMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_message_chatId_sentAt_idx" ON "whatsapp_message"("chatId", "sentAt");


-- AddForeignKey
ALTER TABLE "whatsapp_message" ADD CONSTRAINT "whatsapp_message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "whatsapp_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
