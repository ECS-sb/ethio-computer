import "server-only";
import { db } from "@/lib/db";
import type { TelegramStaffSource } from "@/lib/generated/prisma/client";
import { addisMinuteOfDay, inShift, mentionsSchoolLink } from "@/lib/telegram/school-rules";

/**
 * የወጪ መልዕክቱን ማን ላከው? ቴሌግራም ከየትኛው ስልክ/ዲቫይስ እንደተላከ ለቦቶች አይነግርም፤ ስለዚህ በቅደም ተከተል፦
 * 1. WEB፦ ከዌብሳይቱ የተላከ (ሰራተኛው በራሱ መግቢያ ስለገባ እርግጠኛ ነው) — outbox.ts ያስቀምጠዋል።
 * 2. SIGNATURE፦ መልዕክቱ የሰራተኛውን ፊርማ ይዟል (ለምሳሌ "- Afran")።
 * 3. CHAT_OWNER፦ ተማሪው ለአንድ ሰራተኛ ተመድቧል።
 * 4. SHIFT፦ በዚያ ሰዓት የሚሰራው አንድ ሰራተኛ ብቻ ነው።
 * ካልታወቀ ባዶ ይቀራል (አድሚኑ ፊርማ ወይም ሰዓት ሲያስገባ "እንደገና ቁጠር" ይችላል)።
 */

type StaffRule = { id: string; signature: string | null; shiftStart: number | null; shiftEnd: number | null };

export type Attribution = { staffId: string; source: TelegramStaffSource } | null;

async function loadRules(): Promise<StaffRule[]> {
  return db.telegramStaff.findMany({ where: { active: true }, select: { id: true, signature: true, shiftStart: true, shiftEnd: true } });
}

function signatureMatch(text: string, staff: StaffRule[]): string | null {
  const lower = text.toLowerCase();
  const found = staff.filter((member) => member.signature && member.signature.trim().length >= 2 && lower.includes(member.signature.trim().toLowerCase()));
  return found.length === 1 ? found[0].id : null;
}

export function decide(text: string, sentAt: Date, ownerStaffId: string | null, staff: StaffRule[]): Attribution {
  const signed = signatureMatch(text, staff);
  if (signed) return { staffId: signed, source: "SIGNATURE" };
  if (ownerStaffId && staff.some((member) => member.id === ownerStaffId)) return { staffId: ownerStaffId, source: "CHAT_OWNER" };
  const minute = addisMinuteOfDay(sentAt);
  const onShift = staff.filter((member) => inShift(minute, member.shiftStart, member.shiftEnd));
  return onShift.length === 1 ? { staffId: onShift[0].id, source: "SHIFT" } : null;
}

/**
 * እርግጠኛ በሆነ መንገድ (ከዌብሳይቱ ወይም በፊርማ) የተለየ ሰራተኛ ተማሪውን "ያመጣው" ይሆናል፦ ቻቱ ገና ባለቤት ከሌለው፣
 * ወይም የምዝገባ ሊንኩን የላከው እሱ ከሆነ። አድሚኑ በእጅ የመደበውን አይቀይርም።
 */
export async function maybeClaimStudent(chatRowId: string, staffId: string, text: string) {
  const chat = await db.telegramChat.findUnique({ where: { id: chatRowId }, select: { ownerStaffId: true, ownerManual: true } });
  if (!chat || chat.ownerManual || chat.ownerStaffId === staffId) return;
  if (chat.ownerStaffId === null || mentionsSchoolLink(text)) {
    await db.telegramChat.update({ where: { id: chatRowId }, data: { ownerStaffId: staffId } });
  }
}

/** አዲስ ከስልክ የመጣ የወጪ መልዕክት (ከዌብሳይቱ ያልተላከ) ሲቀመጥ ይጠራል። */
export async function attributeMessage(messageRowId: string) {
  const message = await db.telegramMessage.findUnique({
    where: { id: messageRowId },
    select: { id: true, direction: true, text: true, sentAt: true, staffSource: true, sentByUserId: true, chatId: true, chat: { select: { ownerStaffId: true } } },
  });
  if (!message || message.direction !== "OUT" || message.sentByUserId || message.staffSource === "WEB") return;
  const result = decide(message.text, message.sentAt, message.chat.ownerStaffId, await loadRules());
  if (!result) return;
  await db.telegramMessage.update({ where: { id: message.id }, data: { staffId: result.staffId, staffSource: result.source } });
  if (result.source === "SIGNATURE") await maybeClaimStudent(message.chatId, result.staffId, message.text);
}

/** ከዌብሳይቱ የላከው ሰው ሰራተኛ ከሆነ (አድሚን አይደለም) መለያው። */
export async function staffIdForUser(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return null;
  return (await db.telegramStaff.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } }))?.id ?? null;
}

/**
 * ፊርማ ወይም የስራ ሰዓት ሲቀየር የቆዩትን የትምህርት ቤቱን የወጪ መልዕክቶች እንደገና ይቆጥራል (ከዌብሳይቱ የተላኩት አይነኩም)።
 * የተቀየሩትን መልዕክቶች ብዛት ይመልሳል።
 */
export async function reattributeSchool(since: Date): Promise<number> {
  const staff = await loadRules();
  const rows = await db.telegramMessage.findMany({
    where: {
      direction: "OUT",
      sentAt: { gte: since },
      sentByUserId: null,
      OR: [{ staffSource: null }, { staffSource: { in: ["SIGNATURE", "CHAT_OWNER", "SHIFT"] } }],
      chat: { connection: { category: "SCHOOL" } },
    },
    select: { id: true, text: true, sentAt: true, staffId: true, staffSource: true, chat: { select: { ownerStaffId: true } } },
    take: 20000,
  });
  // ተመሳሳይ ውጤት ያላቸው መልዕክቶች በአንድ updateMany ይቀየራሉ።
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const result = decide(row.text, row.sentAt, row.chat.ownerStaffId, staff);
    const next = result ? `${result.staffId}|${result.source}` : "|";
    if (next === `${row.staffId ?? ""}|${row.staffSource ?? ""}`) continue;
    groups.set(next, [...(groups.get(next) ?? []), row.id]);
  }
  let changed = 0;
  for (const [key, ids] of groups) {
    const [staffId, source] = key.split("|");
    for (let index = 0; index < ids.length; index += 1000) {
      const slice = ids.slice(index, index + 1000);
      await db.telegramMessage.updateMany({
        where: { id: { in: slice } },
        data: { staffId: staffId || null, staffSource: (source || null) as TelegramStaffSource | null },
      });
      changed += slice.length;
    }
  }
  return changed;
}

/** አድሚኑ ተማሪውን ለአንድ ሰራተኛ ይመድባል (ወይም staffId null ሲሆን ምደባውን ያነሳል)፤ የዚያ ቻት ያልታወቁ መልዕክቶችም ይቆጠራሉ። */
export async function setStudentOwner(chatRowId: string, staffId: string | null) {
  await db.telegramChat.update({ where: { id: chatRowId }, data: { ownerStaffId: staffId, ownerManual: staffId !== null } });
  const staff = await loadRules();
  const rows = await db.telegramMessage.findMany({
    where: { chatId: chatRowId, direction: "OUT", sentByUserId: null, OR: [{ staffSource: null }, { staffSource: { in: ["CHAT_OWNER", "SHIFT"] } }] },
    select: { id: true, text: true, sentAt: true },
  });
  for (const row of rows) {
    const result = decide(row.text, row.sentAt, staffId, staff);
    await db.telegramMessage.update({ where: { id: row.id }, data: { staffId: result?.staffId ?? null, staffSource: result?.source ?? null } });
  }
}

export async function saveStaffRules(id: string, rules: { signature: string | null; shiftStart: number | null; shiftEnd: number | null }) {
  await db.telegramStaff.update({ where: { id }, data: rules });
}
