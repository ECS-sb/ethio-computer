import "server-only";
import { db } from "@/lib/db";
import { createT, type Locale, type T } from "@/lib/i18n";
import { isWhatsAppConfigured, sendButtons, sendText, type ReplyButton } from "@/lib/whatsapp/api";
import type { InboundForReply } from "@/lib/whatsapp/ingest";

/** ተመሳሳዩ ሰው በዚህ ጊዜ ውስጥ ደግሞ ሲጽፍ ምናሌው አይደገምም። */
const WELCOME_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export const MENU = { courses: "menu_courses", register: "menu_register", staff: "menu_staff" } as const;

/** አውቶ ሪፕላዮቹ በነባሪ በአማርኛ ናቸው፤ WHATSAPP_REPLY_LOCALE=en ከሆነ በእንግሊዝኛ። */
function replyLocale(): Locale {
  return process.env.WHATSAPP_REPLY_LOCALE === "en" ? "en" : "am";
}

function schoolName(): string {
  return process.env.WHATSAPP_SCHOOL_NAME?.trim() || "Ethio Computer School";
}

function menuButtons(t: T): ReplyButton[] {
  return [
    { id: MENU.courses, title: t("Courses & prices") },
    { id: MENU.register, title: t("Register") },
    { id: MENU.staff, title: t("Talk to a person") },
  ];
}

/** የላክነውን መልዕክት ከሌሎቹ ጋር ያስቀምጣል፤ status በኋላ በwebhook ይዘመናል። */
async function recordAuto(chatId: string, waMessageId: string, type: string, text: string) {
  const now = new Date();
  await db.$transaction([
    db.whatsAppMessage.create({ data: { chatId, waMessageId, direction: "OUT", source: "AUTO", type, text, status: "sent", sentAt: now } }),
    db.whatsAppChat.update({ where: { id: chatId }, data: { lastMessageAt: now, lastDirection: "OUT", lastOutboundAt: now } }),
  ]);
}

async function replyText(message: InboundForReply, text: string) {
  const id = await sendText(message.waId, text);
  await recordAuto(message.chatId, id, "text", text);
}

async function replyMenu(message: InboundForReply, t: T, text: string) {
  const id = await sendButtons(message.waId, text, menuButtons(t));
  await recordAuto(message.chatId, id, "interactive", text);
}

/**
 * ምናሌውን የመላክ መብት በአቶሚክ ይይዛል፤ ተማሪው በአንዴ ብዙ መልዕክት ቢልክ (ወይም webhooks በትይዩ ቢመጡ)
 * ምናሌው አንድ ጊዜ ብቻ ይላካል።
 */
async function claimWelcome(chatId: string, now: Date): Promise<boolean> {
  const claimed = await db.whatsAppChat.updateMany({
    where: { id: chatId, needsHuman: false, OR: [{ welcomedAt: null }, { welcomedAt: { lt: new Date(now.getTime() - WELCOME_COOLDOWN_MS) } }] },
    data: { welcomedAt: now },
  });
  return claimed.count === 1;
}

async function replyOne(message: InboundForReply, t: T) {
  const vars = { name: message.name, school: schoolName() };
  switch (message.replyId) {
    case MENU.courses:
      return replyText(message, t("Thank you! Our staff will send you the list of courses, prices and class times shortly."));
    case MENU.register:
      return replyText(
        message,
        t(
          "Great! To register, please reply with:\n1. Your full name\n2. The course you want\n3. Your preferred time (morning, afternoon, evening or weekend)\n\nOur staff will confirm your registration."
        )
      );
    case MENU.staff:
      await db.whatsAppChat.update({ where: { id: message.chatId }, data: { needsHuman: true } });
      return replyText(message, t("Thank you. A staff member will reply to you here soon."));
  }
  // ሌላ ማንኛውም መልዕክት፦ ምናሌው በቅርቡ ካልተላከ ይላካል፤ አለበለዚያ staff እንዲመልሰው ዝም ይባላል።
  if (await claimWelcome(message.chatId, new Date())) {
    await replyMenu(
      message,
      t,
      t("Hello {name}! 👋 Welcome to {school}.\n\nThis number is only for computer training registration. Please choose one of the options below.", vars)
    );
  }
}

/** ከwebhook ምላሽ በኋላ (after) ይሰራል፤ አንዱ ቢወድቅ ሌሎቹ ይቀጥላሉ። */
export async function sendAutoReplies(messages: InboundForReply[]) {
  if (messages.length === 0 || !isWhatsAppConfigured()) return;
  const t = createT(replyLocale());
  await Promise.all(
    messages.map((message) =>
      replyOne(message, t).catch((error) => console.error("whatsapp: auto-reply to chat", message.chatId, "failed", error))
    )
  );
}
