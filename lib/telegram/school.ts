import "server-only";
import { db } from "@/lib/db";
import { readProfile } from "@/lib/telegram/profile";
import { canReplyNow } from "@/lib/telegram/reply-window";
import { addisDayKey, type DateRange } from "@/lib/telegram/school-range";
import {
  INTERESTED_PATTERN,
  inSegment,
  needsFollowUp,
  REGISTERED_PATTERN,
  SCHOOL_SITE_HOST,
  SEGMENTS,
  stageOf,
  type Segment,
} from "@/lib/telegram/school-rules";

/**
 * የትምህርት ቤቱ ቴሌግራም ትንታኔ፦ እያንዳንዱ ሰራተኛ (አፍራን፣ ሜሮን…) ስንት እንደመለሰ፣ ስንት የምዝገባ ሊንክ እንደላከ፣
 * ስንት ተማሪ እንደተመዘገበና እንደከፈለ፣ የገባው ብርና ደረሰኞቹ፤ ተማሪዎቹ በደረጃ (ለማርኬቲንግ)።
 * ብሩና ተማሪው የሚቆጠረው ተማሪውን ላመጣው ሰራተኛ ነው፦ አድሚኑ የመደበው → የመጨረሻውን ሊንክ የላከው → ብዙ የመለሰለት።
 */

const linkLike = `%${SCHOOL_SITE_HOST}%`;
const DAY = 24 * 60 * 60 * 1000;

/** ሰራተኛ ያልሆነ ባለቤት/አድሚን ከዌብሳይቱ ሲልክ እና ማን እንደላከ ሳይታወቅ ሲቀር። */
export const ADMIN_KEY = "admin";
export const UNKNOWN_KEY = "none";

type StudentRow = {
  id: string;
  name: string;
  username: string | null;
  profile: unknown;
  createdAt: Date;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  lastDirection: "IN" | "OUT";
  ownerStaffId: string | null;
  paid: boolean;
  agreed: boolean;
  linkAt: Date | null;
  confirmedAt: Date | null;
  interested: boolean;
};

/** ሁሉም የትምህርት ቤቱ ተማሪዎች (ቻቶች) ከደረጃቸው ጋር። */
export async function getStudents(now = new Date()) {
  const rows = await db.$queryRaw<StudentRow[]>`
    SELECT c.id, c.name, c.username, c.profile, c."createdAt", c."lastMessageAt", c."lastInboundAt",
      c."lastDirection"::text AS "lastDirection", c."ownerStaffId",
      (EXISTS (SELECT 1 FROM telegram_deal d WHERE d."chatId" = c.id AND d.status IN ('PAID', 'DELIVERED') AND d."paidToCompany" IS DISTINCT FROM false)
        OR EXISTS (SELECT 1 FROM telegram_message m JOIN telegram_receipt r ON r."messageId" = m.id
                   WHERE m."chatId" = c.id AND r."isReceipt" AND r."toCompany" IS DISTINCT FROM false)) AS paid,
      EXISTS (SELECT 1 FROM telegram_deal d WHERE d."chatId" = c.id AND d.status = 'AGREED') AS agreed,
      (SELECT MIN(m."sentAt") FROM telegram_message m
        WHERE m."chatId" = c.id AND m.direction = 'OUT' AND m."deletedAt" IS NULL AND m.text ILIKE ${linkLike}) AS "linkAt",
      (SELECT MAX(m."sentAt") FROM telegram_message m
        WHERE m."chatId" = c.id AND m.direction = 'IN' AND m.text ~* ${REGISTERED_PATTERN}) AS "confirmedAt",
      (EXISTS (SELECT 1 FROM telegram_deal d WHERE d."chatId" = c.id AND d.status = 'NEGOTIATING')
        OR EXISTS (SELECT 1 FROM telegram_message m WHERE m."chatId" = c.id AND m.direction = 'IN' AND m.text ~* ${INTERESTED_PATTERN})) AS interested
    FROM telegram_chat c
    JOIN telegram_connection k ON k.id = c."connectionId"
    WHERE k.category = 'SCHOOL'
    ORDER BY c."lastMessageAt" DESC`;
  return rows.map((row) => {
    const stage = stageOf(row, now);
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      createdAt: row.createdAt,
      lastMessageAt: row.lastMessageAt,
      lastInboundAt: row.lastInboundAt,
      waitingForUs: row.lastDirection === "IN",
      ownerStaffId: row.ownerStaffId,
      linkSent: row.linkAt !== null,
      stage,
      followUp: needsFollowUp(stage, row.lastMessageAt, now),
      /** ቴሌግራም ቦቱ እንዲልክለት ይፈቅዳል (ባለፉት 24 ሰዓታት ጽፏል) */
      canSend: canReplyNow(row.lastInboundAt, now),
      phones: readProfile(row.profile).phones,
    };
  });
}

export type Student = Awaited<ReturnType<typeof getStudents>>[number];

export function segmentCounts(students: Student[]): Record<Segment, number> {
  return Object.fromEntries(SEGMENTS.map((segment) => [segment, students.filter((student) => inSegment(segment, student.stage, student.followUp)).length])) as Record<
    Segment,
    number
  >;
}

export async function listStaffNames() {
  return db.telegramStaff.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, active: true, signature: true, shiftStart: true, shiftEnd: true },
  });
}

type OutRow = { bucket: string; messages: number; chats: number; links: number; web: number; signature: number; owner: number; shift: number };
type DailyRow = { day: string; staffId: string | null; source: string | null; direction: "IN" | "OUT"; messages: number; links: number };
type CreditRow = { id: string; owner: string | null; linkStaff: string | null; topStaff: string | null };

function bucketOf(staffId: string | null, source: string | null): string {
  if (staffId) return staffId;
  return source === "WEB" ? ADMIN_KEY : UNKNOWN_KEY;
}

type StaffStats = {
  replies: number;
  chats: number;
  links: number;
  registered: number;
  paidStudents: number;
  etb: number;
  receipts: { messageId: string; chatId: string; chatName: string; amountEtb: number | null; provider: string | null; toCompany: boolean | null; sentAt: Date }[];
};

function emptyStats(): StaffStats {
  return { replies: 0, chats: 0, links: 0, registered: 0, paidStudents: 0, etb: 0, receipts: [] };
}

type DayStats = { newUsers: number; inbound: number; outbound: number; links: number; registered: number; paidStudents: number; etb: number; byStaff: Record<string, { replies: number; etb: number }> };

export async function getSchoolAnalytics(range: DateRange, now = new Date()) {
  const { from, to } = range;
  const school = { connection: { category: "SCHOOL" as const } };
  const [staff, outRows, inbound, dailyRows, hourRows, deals, receipts, confirmations, totalUsers, newChats, students] = await Promise.all([
    listStaffNames(),
    db.$queryRaw<OutRow[]>`
      SELECT COALESCE(m."staffId", CASE WHEN m."staffSource" = 'WEB' THEN ${ADMIN_KEY} ELSE ${UNKNOWN_KEY} END) AS bucket,
        COUNT(*)::int AS messages, COUNT(DISTINCT m."chatId")::int AS chats,
        (COUNT(*) FILTER (WHERE m.text ILIKE ${linkLike}))::int AS links,
        (COUNT(*) FILTER (WHERE m."staffSource" = 'WEB'))::int AS web,
        (COUNT(*) FILTER (WHERE m."staffSource" = 'SIGNATURE'))::int AS signature,
        (COUNT(*) FILTER (WHERE m."staffSource" = 'CHAT_OWNER'))::int AS owner,
        (COUNT(*) FILTER (WHERE m."staffSource" = 'SHIFT'))::int AS shift
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      JOIN telegram_connection k ON k.id = c."connectionId"
      WHERE k.category = 'SCHOOL' AND m.direction = 'OUT' AND m."broadcastId" IS NULL AND m."sentAt" >= ${from} AND m."sentAt" < ${to}
      GROUP BY 1`,
    db.$queryRaw<{ messages: number; people: number }[]>`
      SELECT COUNT(*)::int AS messages, COUNT(DISTINCT m."chatId")::int AS people
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      JOIN telegram_connection k ON k.id = c."connectionId"
      WHERE k.category = 'SCHOOL' AND m.direction = 'IN' AND m."sentAt" >= ${from} AND m."sentAt" < ${to}`,
    db.$queryRaw<DailyRow[]>`
      SELECT to_char(m."sentAt" + interval '3 hours', 'YYYY-MM-DD') AS day, m."staffId", m."staffSource"::text AS source,
        m.direction::text AS direction, COUNT(*)::int AS messages, (COUNT(*) FILTER (WHERE m.text ILIKE ${linkLike}))::int AS links
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      JOIN telegram_connection k ON k.id = c."connectionId"
      WHERE k.category = 'SCHOOL' AND m."broadcastId" IS NULL AND m."sentAt" >= ${from} AND m."sentAt" < ${to}
      GROUP BY 1, 2, 3, 4`,
    db.$queryRaw<{ hour: number; messages: number }[]>`
      SELECT EXTRACT(HOUR FROM m."sentAt" + interval '3 hours')::int AS hour, COUNT(*)::int AS messages
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      JOIN telegram_connection k ON k.id = c."connectionId"
      WHERE k.category = 'SCHOOL' AND m.direction = 'IN' AND m."sentAt" >= ${from} AND m."sentAt" < ${to}
      GROUP BY 1`,
    db.telegramDeal.findMany({
      where: { dealAt: { gte: from, lt: to }, chat: school },
      select: { chatId: true, kind: true, status: true, amountEtb: true, paidToCompany: true, dealAt: true },
    }),
    db.telegramReceipt.findMany({
      where: { isReceipt: true, message: { sentAt: { gte: from, lt: to }, chat: school } },
      orderBy: { message: { sentAt: "desc" } },
      select: {
        amountEtb: true,
        toCompany: true,
        provider: true,
        message: { select: { id: true, chatId: true, sentAt: true, chat: { select: { name: true } } } },
      },
    }),
    db.$queryRaw<{ chatId: string; at: Date }[]>`
      SELECT m."chatId", MIN(m."sentAt") AS at
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      JOIN telegram_connection k ON k.id = c."connectionId"
      WHERE k.category = 'SCHOOL' AND m.direction = 'IN' AND m.text ~* ${REGISTERED_PATTERN} AND m."sentAt" >= ${from} AND m."sentAt" < ${to}
      GROUP BY 1`,
    db.telegramChat.count({ where: school }),
    db.telegramChat.findMany({ where: { ...school, createdAt: { gte: from, lt: to } }, select: { id: true, createdAt: true } }),
    getStudents(now),
  ]);

  // ---- እያንዳንዱ ተማሪ (ቻት) በዚህ ክልል ውስጥ፦ ተመዝግቧል? ከፍሏል? ስንት ብር?
  type ChatOutcome = { registeredAt: Date | null; paidAt: Date | null; dealEtb: number; receiptEtb: number; receipts: StaffStats["receipts"] };
  const outcomes = new Map<string, ChatOutcome>();
  const outcome = (chatId: string) => {
    let value = outcomes.get(chatId);
    if (!value) {
      value = { registeredAt: null, paidAt: null, dealEtb: 0, receiptEtb: 0, receipts: [] };
      outcomes.set(chatId, value);
    }
    return value;
  };
  const earliest = (current: Date | null, next: Date) => (current === null || next < current ? next : current);

  for (const row of confirmations) outcome(row.chatId).registeredAt = earliest(outcome(row.chatId).registeredAt, row.at);
  for (const deal of deals) {
    const item = outcome(deal.chatId);
    if (deal.kind === "REGISTRATION" && deal.status !== "CANCELLED" && deal.status !== "NEGOTIATING") item.registeredAt = earliest(item.registeredAt, deal.dealAt);
    if ((deal.status === "PAID" || deal.status === "DELIVERED") && deal.paidToCompany !== false) {
      item.paidAt = earliest(item.paidAt, deal.dealAt);
      item.dealEtb += deal.amountEtb ?? 0;
    }
  }
  for (const receipt of receipts) {
    const item = outcome(receipt.message.chatId);
    item.receipts.push({
      messageId: receipt.message.id,
      chatId: receipt.message.chatId,
      chatName: receipt.message.chat.name,
      amountEtb: receipt.amountEtb === null ? null : Math.round(receipt.amountEtb),
      provider: receipt.provider,
      toCompany: receipt.toCompany,
      sentAt: receipt.message.sentAt,
    });
    if (receipt.toCompany !== false) {
      item.paidAt = earliest(item.paidAt, receipt.message.sentAt);
      item.receiptEtb += Math.round(receipt.amountEtb ?? 0);
    }
  }

  // ---- ተማሪውን ያመጣው ሰራተኛ
  const chatIds = [...outcomes.keys()];
  const credits = chatIds.length
    ? await db.$queryRaw<CreditRow[]>`
        SELECT c.id, c."ownerStaffId" AS owner,
          (SELECT m."staffId" FROM telegram_message m
            WHERE m."chatId" = c.id AND m.direction = 'OUT' AND m."staffId" IS NOT NULL AND m.text ILIKE ${linkLike}
            ORDER BY m."sentAt" DESC LIMIT 1) AS "linkStaff",
          (SELECT m."staffId" FROM telegram_message m
            WHERE m."chatId" = c.id AND m.direction = 'OUT' AND m."staffId" IS NOT NULL AND m."broadcastId" IS NULL
            GROUP BY m."staffId" ORDER BY COUNT(*) DESC LIMIT 1) AS "topStaff"
        FROM telegram_chat c WHERE c.id = ANY(${chatIds})`
    : [];
  const creditedTo = new Map(credits.map((row) => [row.id, row.owner ?? row.linkStaff ?? row.topStaff ?? UNKNOWN_KEY]));

  // ---- በሰራተኛ
  const byStaff = new Map<string, StaffStats>();
  const statsFor = (key: string) => {
    let value = byStaff.get(key);
    if (!value) {
      value = emptyStats();
      byStaff.set(key, value);
    }
    return value;
  };
  for (const member of staff) if (member.active) statsFor(member.id);
  for (const row of outRows) {
    const stats = statsFor(row.bucket);
    stats.replies += row.messages;
    stats.chats += row.chats;
    stats.links += row.links;
  }

  // ---- በቀን
  const daily = new Map<string, DayStats>(range.days.map((day) => [day, { newUsers: 0, inbound: 0, outbound: 0, links: 0, registered: 0, paidStudents: 0, etb: 0, byStaff: {} }]));
  const dayStats = (date: Date | string) => daily.get(typeof date === "string" ? date : addisDayKey(date));
  for (const row of dailyRows) {
    const day = dayStats(row.day);
    if (!day) continue;
    if (row.direction === "IN") {
      day.inbound += row.messages;
      continue;
    }
    day.outbound += row.messages;
    day.links += row.links;
    const key = bucketOf(row.staffId, row.source);
    day.byStaff[key] = { replies: (day.byStaff[key]?.replies ?? 0) + row.messages, etb: day.byStaff[key]?.etb ?? 0 };
  }
  for (const chat of newChats) {
    const day = dayStats(chat.createdAt);
    if (day) day.newUsers += 1;
  }

  const createdAt = new Map(students.map((student) => [student.id, student.createdAt]));
  let totalEtb = 0;
  let registeredCount = 0;
  let paidCount = 0;
  const payDays: number[] = [];
  for (const [chatId, item] of outcomes) {
    const key = creditedTo.get(chatId) ?? UNKNOWN_KEY;
    const stats = statsFor(key);
    // ደረሰኙና AI ያገኘው ስምምነት አንድ ክፍያ ሊሆኑ ስለሚችሉ አይደመሩም፦ ስምምነቱ ካለ እሱ፣ ከሌለ የደረሰኞቹ ድምር።
    const etb = item.dealEtb > 0 ? item.dealEtb : item.receiptEtb;
    stats.receipts.push(...item.receipts);
    if (item.registeredAt) {
      stats.registered += 1;
      registeredCount += 1;
      const day = dayStats(item.registeredAt);
      if (day) day.registered += 1;
    }
    if (item.paidAt) {
      stats.paidStudents += 1;
      stats.etb += etb;
      paidCount += 1;
      totalEtb += etb;
      const day = dayStats(item.paidAt);
      if (day) {
        day.paidStudents += 1;
        day.etb += etb;
        day.byStaff[key] = { replies: day.byStaff[key]?.replies ?? 0, etb: (day.byStaff[key]?.etb ?? 0) + etb };
      }
      const first = createdAt.get(chatId);
      if (first) payDays.push(Math.max(0, (item.paidAt.getTime() - first.getTime()) / DAY));
    }
  }

  const names = new Map(staff.map((member) => [member.id, member.name]));
  const order = [...staff.map((member) => member.id), ADMIN_KEY, UNKNOWN_KEY];
  const staffRows = order
    .filter((key) => byStaff.has(key))
    .map((key) => {
      const stats = byStaff.get(key) as StaffStats;
      return { key, name: names.get(key) ?? null, ...stats, share: totalEtb > 0 ? stats.etb / totalEtb : 0 };
    })
    .filter((row) => row.key !== UNKNOWN_KEY && row.key !== ADMIN_KEY ? true : row.replies + row.registered + row.paidStudents + row.receipts.length > 0);

  const outTotal = outRows.reduce((sum, row) => sum + row.messages, 0);
  const sum = (pick: (row: OutRow) => number) => outRows.reduce((total, row) => total + pick(row), 0);
  const sources = { WEB: sum((row) => row.web), SIGNATURE: sum((row) => row.signature), CHAT_OWNER: sum((row) => row.owner), SHIFT: sum((row) => row.shift), none: 0 };
  sources.none = outTotal - sources.WEB - sources.SIGNATURE - sources.CHAT_OWNER - sources.SHIFT;

  const newIds = new Set(newChats.map((chat) => chat.id));
  const paidNew = students.filter((student) => newIds.has(student.id) && student.stage === "paid").length;
  const hours = Array.from({ length: 24 }, (_, hour) => hourRows.find((row) => row.hour === hour)?.messages ?? 0);

  return {
    staff,
    staffRows,
    days: range.days.map((day) => ({ day, ...(daily.get(day) as DayStats) })),
    totals: {
      users: totalUsers,
      newUsers: newChats.length,
      activePeople: inbound[0]?.people ?? 0,
      inbound: inbound[0]?.messages ?? 0,
      outbound: outTotal,
      links: outRows.reduce((sum, row) => sum + row.links, 0),
      registered: registeredCount,
      paidStudents: paidCount,
      etb: totalEtb,
      receipts: receipts.length,
      conversion: newChats.length > 0 ? paidNew / newChats.length : null,
      averageDaysToPay: payDays.length ? payDays.reduce((sum, value) => sum + value, 0) / payDays.length : null,
    },
    attribution: { total: outTotal, identified: outTotal - sources.none, sources },
    hours,
    segments: segmentCounts(students),
    waitingNow: students.filter((student) => student.waitingForUs && student.lastInboundAt && now.getTime() - student.lastInboundAt.getTime() < 7 * DAY).length,
  };
}

export type SchoolAnalytics = Awaited<ReturnType<typeof getSchoolAnalytics>>;

export async function listBroadcasts() {
  const rows = await db.telegramBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 15 });
  if (rows.length === 0) return [];
  // ከተላከ በኋላ መልስ የሰጡ ተማሪዎች (የመልዕክቱ ውጤት)።
  const recipientIds = [...new Set(rows.flatMap((row) => row.recipientIds))];
  const chats = await db.telegramChat.findMany({ where: { id: { in: recipientIds } }, select: { id: true, lastInboundAt: true } });
  const lastIn = new Map(chats.map((chat) => [chat.id, chat.lastInboundAt]));
  return rows.map((row) => ({
    ...row,
    replied: row.recipientIds.filter((id) => {
      const at = lastIn.get(id);
      return at !== null && at !== undefined && at > row.createdAt;
    }).length,
  }));
}
