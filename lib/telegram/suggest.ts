import "server-only";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/marketplace";
import { aiEnabled, suggestReply } from "@/lib/telegram/ai";
import { describeCompany, loadCompanyProfile } from "@/lib/telegram/company";
import { readProfile } from "@/lib/telegram/profile";
import { buildTranscript } from "@/lib/telegram/transcript";

const SUGGESTION_MESSAGES = 60;

/**
 * ለሰውየው የመጨረሻ መልዕክት AI የመልስ ሀሳብ ያዘጋጃል እና ያስቀምጣል (አዲስ መልዕክት እስኪመጣ ድረስ ሌላ ሰራተኛ ሲከፍተውም ያው ይታያል፣ ወጪው አይደገምም)።
 * force፦ "ሌላ ሀሳብ" ሲጫን አዲስ ያዘጋጃል። የተገዛበት ዋጋ ወደ AI አይላክም (ሰራተኞች እንዳያዩት)።
 */
export async function suggestionFor(chatRowId: string, force: boolean): Promise<string | null> {
  if (!aiEnabled()) throw new DomainError("AI analysis is not set up yet.");
  const chat = await db.telegramChat.findUnique({
    where: { id: chatRowId },
    select: {
      id: true,
      name: true,
      profile: true,
      aiSummary: true,
      suggestedReply: true,
      suggestedForMessageId: true,
      connection: { select: { ownerName: true } },
      channelsBought: { select: { title: true, salePrice: true, saleStatus: true } },
      channelsSold: { select: { title: true, sourceStatus: true } },
    },
  });
  if (!chat) throw new DomainError("Check what you entered and try again.");
  const rows = await db.telegramMessage.findMany({
    where: { chatId: chat.id, deletedAt: null },
    orderBy: [{ sentAt: "desc" }, { messageId: "desc" }],
    take: SUGGESTION_MESSAGES,
    select: {
      id: true,
      direction: true,
      viaBot: true,
      text: true,
      mediaType: true,
      sentAt: true,
      deletedAt: true,
      previousText: true,
      receipt: { select: { isReceipt: true, provider: true, amountEtb: true, recipientName: true, recipientAccount: true, transactionId: true, toCompany: true } },
    },
  });
  const messages = rows.reverse();
  const lastIn = [...messages].reverse().find((message) => message.direction === "IN");
  if (!lastIn) return null;
  if (!force && chat.suggestedForMessageId === lastIn.id && chat.suggestedReply) return chat.suggestedReply;

  const profile = readProfile(chat.profile);
  const channels = [
    ...chat.channelsBought.map((channel) => `buying from us: ${channel.title}${channel.salePrice ? `, price ${channel.salePrice} ETB` : ""}, ${channel.saleStatus ?? "?"}`),
    ...chat.channelsSold.map((channel) => `selling to us: ${channel.title}, ${channel.sourceStatus ?? "?"}`),
  ];
  const header = [
    `Person: ${chat.name}${profile.role ? ` (${profile.role.toLowerCase()})` : ""}`,
    `Company Telegram account: ${chat.connection.ownerName}`,
    chat.aiSummary ? `Earlier summary: ${chat.aiSummary}` : null,
    channels.length > 0 ? `Channels in this chat: ${channels.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const reply = await suggestReply(header, buildTranscript(messages), describeCompany(loadCompanyProfile()));
  if (!reply) return null;
  await db.telegramChat.update({ where: { id: chat.id }, data: { suggestedReply: reply, suggestedForMessageId: lastIn.id, suggestedAt: new Date() } });
  return reply;
}
