import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { aiEnabled, AI_MODEL } from "@/lib/telegram/ai";
import { countPending } from "@/lib/telegram/analyze";
import { summarizeChannels } from "@/lib/telegram/channels";
import { startOfTodayInAddis, summarizeDeals } from "@/lib/telegram/stats";

const DAY = 24 * 60 * 60 * 1000;

export async function getTelegramSales() {
  const now = Date.now();
  const today = startOfTodayInAddis();
  const weekAgo = new Date(now - 7 * DAY);
  const monthAgo = new Date(now - 30 * DAY);
  const [deals, pending, soldChannels] = await Promise.all([
    db.telegramDeal.findMany({
      where: { dealAt: { gte: monthAgo } },
      orderBy: { dealAt: "desc" },
      take: 300,
      select: {
        id: true,
        kind: true,
        item: true,
        amountEtb: true,
        status: true,
        paidToCompany: true,
        customerName: true,
        customerPhone: true,
        note: true,
        dealAt: true,
        chat: { select: { id: true, name: true, username: true, connection: { select: { ownerName: true } } } },
      },
    }),
    countPending(),
    db.telegramChannel.findMany({
      where: { soldAt: { gte: monthAgo } },
      select: { purchasePrice: true, paidToSellerEtb: true, salePrice: true, buyerPaidEtb: true, refundedEtb: true, saleStatus: true },
    }),
  ]);
  return {
    deals,
    channels: summarizeChannels(soldChannels),
    today: summarizeDeals(deals.filter((deal) => deal.dealAt >= today)),
    week: summarizeDeals(deals.filter((deal) => deal.dealAt >= weekAgo)),
    pending,
    aiEnabled: aiEnabled(),
    model: AI_MODEL,
  };
}

export const TELEGRAM_CHAT_PAGE = 300;

/** የአንድ ቻናል መዝገብ ከሻጩና ከገዢው ቻት ስሞች ጋር (በቻቱ ገጽ፣ በቻናሎች ዝርዝር እና በቻናሉ ገጽ)። */
export const channelSelect = {
  id: true,
  platform: true,
  title: true,
  link: true,
  purchasePrice: true,
  paidToSellerEtb: true,
  sourceStatus: true,
  salePrice: true,
  buyerPaidEtb: true,
  refundedEtb: true,
  saleStatus: true,
  soldAt: true,
  lastActivityAt: true,
  lockedFields: true,
  sellerChat: { select: { id: true, name: true } },
  buyerChat: { select: { id: true, name: true } },
} satisfies Prisma.TelegramChannelSelect;

export type ChannelRow = Prisma.TelegramChannelGetPayload<{ select: typeof channelSelect }>;

/** በእጅ ለማገናኘት፦ ገዢ የሌላቸው የሻጭ ቻናሎች እና ሻጭ የሌላቸው የገዢ ቻናሎች (ከዚህ ቻት ውጭ)። */
export async function getLinkCandidates(chatId: string) {
  const [sellerOnly, buyerOnly] = await Promise.all([
    db.telegramChannel.findMany({
      where: { buyerChatId: null, sellerChatId: { not: null }, NOT: { sellerChatId: chatId } },
      orderBy: { lastActivityAt: "desc" },
      take: 60,
      select: channelSelect,
    }),
    db.telegramChannel.findMany({
      where: { sellerChatId: null, buyerChatId: { not: null }, NOT: { buyerChatId: chatId } },
      orderBy: { lastActivityAt: "desc" },
      take: 60,
      select: channelSelect,
    }),
  ]);
  return { sellerOnly, buyerOnly };
}

export async function getTelegramChannel(id: string) {
  return db.telegramChannel.findUnique({ where: { id }, select: channelSelect });
}

/** የቻናሎች ዝርዝር፦ በተመረጠው ጊዜ ውስጥ የተሸጡ (ትርፉ የሚቆጠርባቸው) እና በዚያ ጊዜ እንቅስቃሴ የነበራቸው። */
export async function getTelegramChannels(since: Date) {
  return db.telegramChannel.findMany({
    where: { OR: [{ soldAt: { gte: since } }, { lastActivityAt: { gte: since } }] },
    orderBy: [{ lastActivityAt: "desc" }],
    take: 500,
    select: channelSelect,
  });
}

export async function getTelegramChat(id: string) {
  const chat = await db.telegramChat.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      chatId: true,
      createdAt: true,
      lastInboundAt: true,
      aiSummary: true,
      analyzedAt: true,
      profile: true,
      tags: true,
      _count: { select: { messages: true } },
      connection: { select: { ownerName: true, ownerUsername: true } },
      deals: {
        orderBy: { dealAt: "desc" },
        select: { id: true, kind: true, item: true, amountEtb: true, status: true, paidToCompany: true, note: true, dealAt: true },
      },
      channelsSold: { orderBy: { lastActivityAt: "desc" }, select: channelSelect },
      channelsBought: { orderBy: { lastActivityAt: "desc" }, select: channelSelect },
      alerts: {
        orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
        select: { id: true, type: true, severity: true, evidence: true, resolved: true, createdAt: true, messageId: true },
      },
    },
  });
  if (!chat) return null;
  const messages = await db.telegramMessage.findMany({
    where: { chatId: id },
    orderBy: [{ sentAt: "desc" }, { messageId: "desc" }],
    take: TELEGRAM_CHAT_PAGE,
    select: {
      id: true,
      direction: true,
      senderName: true,
      viaBot: true,
      text: true,
      mediaType: true,
      mimeType: true,
      mediaFile: { select: { width: true, height: true } },
      sentAt: true,
      editedAt: true,
      previousText: true,
      deletedAt: true,
      receipt: {
        select: { isReceipt: true, provider: true, amountEtb: true, recipientName: true, recipientAccount: true, transactionId: true, toCompany: true },
      },
    },
  });
  const flagged = new Set(chat.alerts.filter((alert) => !alert.resolved && alert.messageId).map((alert) => alert.messageId));
  return {
    ...chat,
    // BigInt ወደ ብራውዘር (client component) ሊላክ ስለማይችል ጽሑፍ ይደረጋል።
    chatId: chat.chatId.toString(),
    messages: messages.reverse().map((message) => ({ ...message, flagged: flagged.has(message.id) })),
    truncated: messages.length === TELEGRAM_CHAT_PAGE,
    aiEnabled: aiEnabled(),
  };
}
