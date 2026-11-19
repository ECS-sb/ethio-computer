import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { toDbCategory, type AccountCategory } from "@/lib/telegram/accounts";
import { FOLDERS, type Folder, type InboxParams } from "@/lib/telegram/folders";
import { periodStart, type PeriodId } from "@/lib/telegram/periods";
import { WITHDRAWAL_TAG } from "@/lib/telegram/profile";

export const INBOX_LIMIT = 100;

/** "ምላሽ የሚጠብቁ" የሚባሉት ባለፉት 7 ቀናት የጻፉ ደንበኞች ብቻ ናቸው። */
export function waitingSince(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function folderWhere(folder: Folder): Prisma.TelegramChatWhereInput {
  switch (folder) {
    case "waiting":
      // የቆዩ (ከexport የመጡ) ያልተመለሱ ቻቶች ፎልደሩን እንዳይሞሉት ባለፉት 7 ቀናት የጻፉ ብቻ።
      return { lastDirection: "IN", lastInboundAt: { gte: waitingSince() } };
    case "alerts":
      return { alerts: { some: { resolved: false } } };
    case "progress":
      return { deals: { some: { status: { in: ["NEGOTIATING", "AGREED"] } } } };
    case "paid":
      return { deals: { some: { status: { in: ["PAID", "DELIVERED"] } } } };
    case "sales":
      return { deals: { some: { kind: "SALE", status: { not: "CANCELLED" } } } };
    case "registrations":
      return { deals: { some: { kind: "REGISTRATION", status: { not: "CANCELLED" } } } };
    case "withdrawals":
      return { tags: { has: WITHDRAWAL_TAG } };
    case "receipts":
      return { messages: { some: { receipt: { is: { isReceipt: true } } } } };
    default:
      return {};
  }
}

/** ደንበኛው ከሰራተኛው የመጨረሻ ምላሽ በኋላ የላካቸው መልዕክቶች (እንደ ቴሌግራም ያልተነበቡ ቁጥር)። */
async function waitingCounts(chatIds: string[]): Promise<Map<string, number>> {
  if (chatIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ chatId: string; count: number }[]>`
    SELECT m."chatId" AS "chatId", COUNT(*)::int AS "count"
    FROM telegram_message m
    JOIN telegram_chat c ON c.id = m."chatId"
    WHERE m."chatId" = ANY(${chatIds})
      AND m.direction = 'IN'
      AND m."sentAt" > COALESCE(c."lastOutboundAt", 'epoch'::timestamp)
    GROUP BY m."chatId"`;
  return new Map(rows.map((row) => [row.chatId, row.count]));
}

type PeriodRow = { inbound: number; outbound: number; people: number; replies: number; averageSeconds: number | null; slowReplies: number };

/**
 * በተመረጠው ጊዜ ውስጥ የመጡና የተላኩ መልዕክቶች፣ የጻፉ ሰዎች እና የምላሽ ጊዜ (በአንድ SQL፣ ብዙ መልዕክት ቢኖርም)።
 * የምላሽ ጊዜ፦ ደንበኛው ከሰራተኛው በኋላ (ወይም መጀመሪያ) የጻፈው መልዕክት እስከ ቀጣዩ የሰራተኛ መልዕክት ድረስ።
 */
async function periodStats(since: Date, accounts: string[]) {
  const [row] = await db.$queryRaw<PeriodRow[]>`
    WITH msgs AS (
      SELECT m."chatId", m.direction, m."sentAt",
        LAG(m.direction) OVER w AS prev_direction,
        MIN(CASE WHEN m.direction = 'OUT' THEN m."sentAt" END) OVER (w ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING) AS next_reply
      FROM telegram_message m
      JOIN telegram_chat c ON c.id = m."chatId"
      WHERE m."sentAt" >= ${since} AND c."connectionId" = ANY(${accounts})
      WINDOW w AS (PARTITION BY m."chatId" ORDER BY m."sentAt", m."messageId")
    ), waits AS (
      SELECT EXTRACT(EPOCH FROM (next_reply - "sentAt")) AS seconds
      FROM msgs
      WHERE direction = 'IN' AND (prev_direction IS NULL OR prev_direction = 'OUT') AND next_reply IS NOT NULL
    )
    SELECT
      (SELECT COUNT(*) FROM msgs WHERE direction = 'IN')::int AS inbound,
      (SELECT COUNT(*) FROM msgs WHERE direction = 'OUT')::int AS outbound,
      (SELECT COUNT(DISTINCT "chatId") FROM msgs WHERE direction = 'IN')::int AS people,
      (SELECT COUNT(*) FROM waits)::int AS replies,
      (SELECT AVG(seconds) FROM waits)::float8 AS "averageSeconds",
      (SELECT COUNT(*) FROM waits WHERE seconds > 3600)::int AS "slowReplies"`;
  return {
    inbound: row?.inbound ?? 0,
    outbound: row?.outbound ?? 0,
    people: row?.people ?? 0,
    replies: row?.replies ?? 0,
    averageMinutes: row?.averageSeconds == null ? null : Math.max(1, Math.round(row.averageSeconds / 60)),
    slowReplies: row?.slowReplies ?? 0,
  };
}

/** የአንድ ምድብ (የሽያጭ ወይም የትምህርት ቤት) ቻቶች፤ ሌላኛው ምድብ በዚህ ዝርዝር ውስጥ ፈጽሞ አይገባም። */
export async function getInbox(params: InboxParams, period: PeriodId, category: AccountCategory) {
  const since = periodStart(period);
  const connections = await db.telegramConnection.findMany({
    where: { category: toDbCategory(category) },
    orderBy: { createdAt: "asc" },
    select: { id: true, ownerName: true, ownerUsername: true, isEnabled: true },
  });
  const ids = connections.map((connection) => connection.id);
  const accounts = params.account && ids.includes(params.account) ? [params.account] : ids;
  const byAccount: Prisma.TelegramChatWhereInput = { connectionId: { in: accounts } };
  const bySearch: Prisma.TelegramChatWhereInput = params.q
    ? { OR: [{ name: { contains: params.q, mode: "insensitive" } }, { username: { contains: params.q, mode: "insensitive" } }] }
    : {};

  const [folderCounts, chats, stats, periodAlerts] = await Promise.all([
    Promise.all(FOLDERS.map((folder) => db.telegramChat.count({ where: { AND: [byAccount, folderWhere(folder)] } }))),
    db.telegramChat.findMany({
      where: { AND: [byAccount, folderWhere(params.folder), bySearch] },
      orderBy: { lastMessageAt: "desc" },
      take: INBOX_LIMIT,
      select: {
        id: true,
        name: true,
        username: true,
        lastMessageAt: true,
        lastDirection: true,
        lastInboundAt: true,
        profile: true,
        connection: { select: { ownerName: true } },
        messages: { orderBy: [{ sentAt: "desc" }, { messageId: "desc" }], take: 1, select: { text: true, mediaType: true, direction: true, deletedAt: true } },
        deals: { orderBy: { dealAt: "desc" }, take: 1, select: { kind: true, status: true, amountEtb: true, item: true, paidToCompany: true } },
        alerts: { where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 1, select: { type: true, evidence: true, messageId: true } },
        _count: { select: { alerts: { where: { resolved: false } } } },
      },
    }),
    periodStats(since, accounts),
    db.telegramAlert.count({ where: { createdAt: { gte: since }, chat: { connectionId: { in: accounts } } } }),
  ]);

  const waiting = await waitingCounts(chats.map((chat) => chat.id));
  const counts = Object.fromEntries(FOLDERS.map((folder, index) => [folder, folderCounts[index]])) as Record<Folder, number>;

  return {
    category,
    connections,
    counts,
    chats: chats.map((chat) => ({ ...chat, waitingCount: waiting.get(chat.id) ?? 0 })),
    truncated: chats.length === INBOX_LIMIT,
    period: { id: period, ...stats, alerts: periodAlerts },
  };
}

export type Inbox = Awaited<ReturnType<typeof getInbox>>;
