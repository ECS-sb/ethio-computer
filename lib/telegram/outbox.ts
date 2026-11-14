import "server-only";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/marketplace";
import { sendBusinessFile, sendBusinessText, TelegramApiError } from "@/lib/telegram/api";
import { recordSentMessage } from "@/lib/telegram/ingest";
import { storeMediaCopies } from "@/lib/telegram/media";
import { isRelayableMedia } from "@/lib/telegram/media-kind";
import { canReplyNow } from "@/lib/telegram/reply-window";
import { sendAlertNotifications } from "@/lib/telegram/report";

type Sender = { userId: string; name: string };

async function loadTarget(chatRowId: string) {
  const chat = await db.telegramChat.findUnique({
    where: { id: chatRowId },
    select: { id: true, chatId: true, lastInboundAt: true, connection: { select: { id: true, canReply: true, isEnabled: true } } },
  });
  if (!chat) throw new DomainError("Check what you entered and try again.");
  if (!chat.connection.canReply || !chat.connection.isEnabled) throw new DomainError("The bot is not allowed to reply yet. Turn on its Reply permission in Telegram Business settings.");
  if (!canReplyNow(chat.lastInboundAt)) throw new DomainError("Telegram only allows replies within 24 hours of the person's last message. Ask them to write first.");
  return chat;
}

function explain(error: unknown): never {
  if (error instanceof TelegramApiError) {
    console.error("telegram send failed:", error.message);
    throw new DomainError("Telegram did not accept the message. Check the bot's Reply permission and try again.");
  }
  throw error;
}

/** ከቴሌግራም የተመለሰውን መልዕክት ያስቀምጣል፣ የላከውን ሰራተኛ ይመዘግባል፣ ማስጠንቀቂያ ካለ ለባለቤቶች ይልካል። */
async function record(sent: Awaited<ReturnType<typeof sendBusinessText>>, connectionId: string, sender: Sender, relayedFromId: string | null) {
  const saved = await recordSentMessage(sent, connectionId, { skipDetection: relayedFromId !== null });
  if (saved.messageRowId) {
    await db.telegramMessage.update({ where: { id: saved.messageRowId }, data: { sentByUserId: sender.userId, sentByName: sender.name.slice(0, 80), relayedFromId } });
  }
  if (saved.mediaCopy) await storeMediaCopies([saved.mediaCopy]).catch((error) => console.error("telegram media copy failed:", error));
  if (saved.alerts.length > 0) await sendAlertNotifications(saved.alerts);
  return saved.messageRowId;
}

/** ሰራተኛው ከዌብሳይቱ የጻፈውን መልዕክት በድርጅቱ አካውንት ስም ይልካል። */
export async function sendReply(chatRowId: string, text: string, sender: Sender) {
  const chat = await loadTarget(chatRowId);
  const sent = await sendBusinessText(chat.connection.id, chat.chatId.toString(), text).catch(explain);
  return record(sent, chat.connection.id, sender, null);
}

/**
 * "ለገዢው ላክ"፦ ከአንዱ ቻት (ለምሳሌ ከሻጩ) የመጣውን መልዕክት (ጽሑፍ፣ ፎቶ ወይም ፋይል) እንዳለ ወደ ሌላኛው ቻት (ገዢው) ይልካል።
 * ኢሜይል፣ ፓስዎርድ፣ የማረጋገጫ ኮዶች በድርጅቱ በኩል ያልፋሉ፤ ሻጩና ገዢው በቀጥታ አይገናኙም።
 */
export async function relayMessage(fromMessageId: string, toChatRowId: string, sender: Sender) {
  const source = await db.telegramMessage.findUnique({
    where: { id: fromMessageId },
    select: { id: true, chatId: true, text: true, mediaType: true, fileId: true },
  });
  if (!source || source.chatId === toChatRowId) throw new DomainError("Check what you entered and try again.");
  // ሁለቱ ቻቶች በአንድ ቻናል (ሻጭ ↔ ገዢ) የተገናኙ መሆን አለባቸው።
  const linked = await db.telegramChannel.findFirst({
    where: {
      OR: [
        { sellerChatId: source.chatId, buyerChatId: toChatRowId },
        { buyerChatId: source.chatId, sellerChatId: toChatRowId },
      ],
    },
    select: { id: true },
  });
  if (!linked) throw new DomainError("These two chats are not linked by a channel.");
  const chat = await loadTarget(toChatRowId);
  const target = chat.chatId.toString();
  let sent;
  if (source.fileId && isRelayableMedia(source.mediaType)) {
    sent = await sendBusinessFile(chat.connection.id, target, source.mediaType, source.fileId, source.text).catch(explain);
  } else if (source.text.trim()) {
    sent = await sendBusinessText(chat.connection.id, target, source.text).catch(explain);
  } else {
    throw new DomainError("This message has nothing that can be sent on.");
  }
  return record(sent, chat.connection.id, sender, source.id);
}
