import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { WaChangeValue, WaMessage, WaReferral, WaStatus, WaWebhook } from "@/lib/whatsapp/types";

/** አውቶ ሪፕላዩ መልስ የሚሰጥበት፣ ደንበኛው የላከው አዲስ መልዕክት። */
export type InboundForReply = { chatId: string; waId: string; name: string; replyId: string | null };

function readContent(message: WaMessage) {
  const media = message.image ?? message.video ?? message.audio ?? message.document ?? message.sticker;
  const reply = message.interactive?.button_reply ?? message.interactive?.list_reply;
  const location = message.location
    ? [message.location.name, message.location.address, `${message.location.latitude},${message.location.longitude}`].filter(Boolean).join(" · ")
    : "";
  const contact = message.contacts?.[0];
  const contactText = contact ? [contact.name?.formatted_name, ...(contact.phones ?? []).map((phone) => phone.phone)].filter(Boolean).join(" ") : "";
  const text =
    message.text?.body ??
    reply?.title ??
    message.button?.text ??
    message.interactive?.nfm_reply?.body ??
    media?.caption ??
    media?.filename ??
    (location || contactText || message.reaction?.emoji || "");
  return {
    text,
    replyId: reply?.id ?? message.button?.payload ?? null,
    mediaId: media?.id ?? null,
    mimeType: media?.mime_type ?? null,
  };
}

function referralData(referral: WaReferral | undefined) {
  if (!referral) return {};
  return {
    adSourceId: referral.source_id ?? null,
    adHeadline: referral.headline ?? null,
    referral: referral as Prisma.InputJsonValue,
  };
}

/** ከደንበኛው (IN) ወይም ከስልኩ app (OUT echo) የመጣ አንድ መልዕክት ያስቀምጣል። አዲስ የደንበኛ መልዕክት ከሆነ ለአውቶ ሪፕላዩ ይመልሰዋል። */
async function saveMessage(message: WaMessage, value: WaChangeValue, echo: boolean): Promise<InboundForReply | null> {
  const waId = echo ? message.to : message.from;
  if (!waId) return null;
  const profileName = echo ? undefined : value.contacts?.find((contact) => contact.wa_id === waId)?.profile?.name;
  const sentAt = new Date(Number(message.timestamp) * 1000);
  const direction = echo ? "OUT" : "IN";
  const directionTimes = echo ? { lastOutboundAt: sentAt } : { lastInboundAt: sentAt };

  const chat = await db.whatsAppChat.upsert({
    where: { waId },
    create: {
      waId,
      name: profileName || `+${waId}`,
      lastMessageAt: sentAt,
      lastDirection: direction,
      ...directionTimes,
      ...referralData(message.referral),
    },
    update: {
      ...(profileName ? { name: profileName } : {}),
      lastMessageAt: sentAt,
      lastDirection: direction,
      ...directionTimes,
      ...referralData(message.referral),
      // ሰራተኛው ከስልኩ ከመለሰ ተማሪው ሰው አግኝቷል።
      ...(echo ? { needsHuman: false } : {}),
    },
    select: { id: true, name: true },
  });

  const content = readContent(message);
  // Meta አንድን webhook ደግሞ ሊልክ ስለሚችል፦ መልዕክቱ ቀድሞ ካለ ምንም አይደረግም፣ አውቶ ሪፕላይም አይደገምም።
  const created = await db.whatsAppMessage.createMany({
    data: {
      chatId: chat.id,
      waMessageId: message.id,
      direction,
      source: echo ? "PHONE" : "CUSTOMER",
      type: message.type,
      text: content.text,
      replyId: content.replyId,
      mediaId: content.mediaId,
      mimeType: content.mimeType,
      sentAt,
    },
    skipDuplicates: true,
  });
  if (echo || created.count === 0 || message.type === "reaction") return null;
  return { chatId: chat.id, waId, name: chat.name, replyId: content.replyId };
}

async function saveStatus(status: WaStatus) {
  const error = status.errors?.[0];
  await db.whatsAppMessage.updateMany({
    where: { waMessageId: status.id },
    data: {
      status: status.status,
      ...(error ? { errorText: [error.code, error.title, error.error_data?.details].filter(Boolean).join(" · ") } : {}),
    },
  });
}

/**
 * አንድን webhook ያስቀምጣል፤ አውቶ ሪፕላይ የሚያስፈልጋቸውን አዲስ መልዕክቶች ይመልሳል።
 * ከሌላ ቁጥር (WHATSAPP_PHONE_NUMBER_ID ያልሆነ) የመጡ ለውጦች ይዘለላሉ።
 */
export async function handleWebhook(payload: WaWebhook): Promise<InboundForReply[]> {
  const ownNumber = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const inbound: InboundForReply[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (ownNumber && value.metadata?.phone_number_id && value.metadata.phone_number_id !== ownNumber) continue;
      for (const message of value.messages ?? []) {
        const saved = await saveMessage(message, value, false);
        if (saved) inbound.push(saved);
      }
      for (const message of value.message_echoes ?? []) await saveMessage(message, value, true);
      for (const status of value.statuses ?? []) await saveStatus(status);
    }
  }
  return inbound;
}
