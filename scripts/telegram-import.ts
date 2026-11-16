// የቴሌግራም Desktop JSON export ውስጥ ያሉትን የቆዩ የግል ቻቶች ወደ ሲስተሙ ያስገባል።
//
//   npx tsx scripts/telegram-import.ts "<DataExport folder>"            → ሙከራ ብቻ (dry run)፤ ምንም አይጽፍም
//   npx tsx scripts/telegram-import.ts "<DataExport folder>" --apply    → በእርግጥ ያስገባል
//   አማራጮች፦ --since=2025-11-14 (ነባሪው፦ የመጨረሻዎቹ 12 ወራት)፣ --all (ሁሉንም ጊዜ)
//
// export-ኑ "Machine-readable JSON" ቅርጸት መሆን አለበት፤ HTML የደንበኞችን የቴሌግራም መለያ ቁጥር አይይዝም።
// ቀድሞ የገቡ መልዕክቶች (ለምሳሌ በwebhook) አይደገሙም። የቆዩ ማስጠንቀቂያዎች በተላኩበት ቀን ይመዘገባሉ፤ ወደ ስልክ አይላኩም።
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import chain from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/pick.js";
import { streamArray } from "stream-json/streamers/stream-array.js";
import { streamValues } from "stream-json/streamers/stream-values.js";
import { detectSideDeal, normalizePhone, parseAllowlist, usernameFromEvidence, type Finding } from "@/lib/telegram/detect";
import { extractContactDetails, mentionsWithdrawal, mergeProfile, readProfile, WITHDRAWAL_TAG, type CustomerProfile } from "@/lib/telegram/profile";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

type TextPart = string | { type: string; text: string; href?: string };
type ExportMessage = {
  id: number;
  type: string;
  date_unixtime?: string;
  edited_unixtime?: string;
  from?: string | null;
  from_id?: string;
  text?: string | TextPart[];
  photo?: string;
  file?: string;
  media_type?: string;
  mime_type?: string;
  sticker_emoji?: string;
  contact_information?: { first_name?: string; last_name?: string; phone_number?: string };
  location_information?: unknown;
};
type ExportChat = { id: number; name?: string | null; type: string; messages?: ExportMessage[] };
type ExportContact = { user_id?: number; first_name?: string; last_name?: string; phone_number?: string };

type Row = {
  messageId: number;
  direction: "IN" | "OUT";
  senderName: string;
  text: string;
  scanText: string;
  contactPhone?: string;
  mediaType: string | null;
  mimeType: string | null;
  sentAt: Date;
  editedAt: Date | null;
};
type PendingChat = { chatId: bigint; name: string; rows: Row[] };

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const allTime = args.includes("--all");
const sinceArg = args.find((arg) => arg.startsWith("--since="))?.slice("--since=".length);
const target = args.find((arg) => !arg.startsWith("--"));
if (!target) {
  console.error('Usage: npx tsx scripts/telegram-import.ts "<DataExport folder or result.json>" [--apply] [--since=YYYY-MM-DD | --all]');
  process.exit(1);
}
const file = fs.statSync(target).isDirectory() ? path.join(target, "result.json") : target;
if (!fs.existsSync(file)) {
  console.error(`✗ ${file} was not found. Export with Format: "Machine-readable JSON".`);
  process.exit(1);
}
const since = allTime ? new Date(0) : sinceArg ? new Date(`${sinceArg}T00:00:00Z`) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
const BATCH_CHATS = 200;
const INSERT_ROWS = 1500;

function flatten(text: ExportMessage["text"]): { text: string; scan: string } {
  if (!text) return { text: "", scan: "" };
  if (typeof text === "string") return { text, scan: text };
  let plain = "";
  const links: string[] = [];
  for (const part of text) {
    if (typeof part === "string") plain += part;
    else {
      plain += part.text;
      if (part.href && part.href !== part.text) links.push(part.href);
    }
  }
  return { text: plain, scan: [plain, ...links].join("\n") };
}

function mediaOf(message: ExportMessage): { mediaType: string | null; mimeType: string | null } {
  if (message.photo) return { mediaType: "photo", mimeType: "image/jpeg" };
  const byKind: Record<string, string> = {
    voice_message: "voice",
    video_message: "video_note",
    video_file: "video",
    animation: "video",
    audio_file: "audio",
    sticker: "sticker",
  };
  if (message.media_type && byKind[message.media_type]) return { mediaType: byKind[message.media_type], mimeType: message.mime_type ?? null };
  if (message.file) return { mediaType: "document", mimeType: message.mime_type ?? null };
  if (message.contact_information) return { mediaType: "contact", mimeType: null };
  if (message.location_information) return { mediaType: "location", mimeType: null };
  return { mediaType: null, mimeType: null };
}

// stream-chain የሚቀበላቸው የእርምጃ አይነቶች በTypeScript ውስጥ በትክክል አይገጥሙም፤ ውጤቱ ግን async iterable ነው።
const pipe = chain as unknown as (steps: unknown[]) => AsyncIterable<{ value: unknown }>;

async function* streamPath<T>(filter: string, kind: "array" | "value") {
  const pipeline = pipe([fs.createReadStream(file), parser(), pick({ filter }), kind === "array" ? streamArray() : streamValues()]);
  for await (const item of pipeline) yield item.value as T;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing in .env.local");
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });

  // 1. የማን አካውንት export ነው? ከተገናኘው የቴሌግራም አካውንት ጋር መመሳሰል አለበት።
  let ownerId: bigint | null = null;
  for await (const info of streamPath<{ user_id?: number; first_name?: string; username?: string }>("personal_information", "value")) {
    ownerId = info.user_id ? BigInt(info.user_id) : null;
    console.log(`Export account: ${info.first_name ?? "?"} ${info.username ?? ""} (id ${info.user_id})`);
    break;
  }
  if (!ownerId) throw new Error("personal_information.user_id is missing. Include 'Account information' in the export.");
  const connection = (await pool.query(`SELECT id, "ownerName" FROM telegram_connection WHERE "ownerId" = $1`, [ownerId.toString()])).rows[0] as
    | { id: string; ownerName: string }
    | undefined;
  if (!connection) throw new Error(`No connected Telegram account has id ${ownerId}. Connect it to the bot first.`);
  console.log(`Matches connected account: ${connection.ownerName}`);
  console.log(`Messages from ${since.toISOString().slice(0, 10)} onward${apply ? "" : " (dry run: nothing is written)"}\n`);

  // 2. የኮንታክት ዝርዝር፦ የደንበኞችን ስልክ ቁጥር ለፕሮፋይሉ።
  const contactPhones = new Map<string, string>();
  for await (const contact of streamPath<ExportContact>("contacts.list", "array")) {
    const phone = contact.phone_number ? (normalizePhone(contact.phone_number) ?? contact.phone_number.replace(/[^\d+]/g, "")) : null;
    if (contact.user_id && phone) contactPhones.set(String(contact.user_id), phone);
  }

  const allow = parseAllowlist(process.env.TELEGRAM_ALLOWED_CONTACTS);
  const owners = (await pool.query(`SELECT "ownerUsername" FROM telegram_connection WHERE "ownerUsername" IS NOT NULL`)).rows as { ownerUsername: string }[];
  for (const { ownerUsername } of owners) allow.usernames.add(ownerUsername.toLowerCase());
  const listed = new Set(((await pool.query(`SELECT username FROM listing`)).rows as { username: string }[]).map((row) => row.username.toLowerCase()));
  // ሰራተኛ የላከው መልዕክት ውስጥ የሽሽጥ ምልክቶች (ለሽያጭ የቀረቡ የEthio Computer አካውንቶች ሊንክ አይቆጠርም)
  const findingsFor = (row: Row): Finding[] =>
    detectSideDeal(row.scanText, allow, { contactPhone: row.contactPhone }).filter((finding) => {
      if (finding.type !== "TELEGRAM_CONTACT") return true;
      const username = usernameFromEvidence(finding.evidence);
      return !username || !listed.has(username);
    });

  // ቀድሞ ያሉት መልዕክቶች (ለተደጋጋሚነት ፍተሻ እና የቴሌግራም መልዕክት ቁጥሮች መመሳሰላቸውን ለማረጋገጥ)
  const existingKeys = new Set(
    (
      (
        await pool.query(
          `SELECT c."chatId"::text AS chat, m."messageId" AS id FROM telegram_message m JOIN telegram_chat c ON c.id = m."chatId" WHERE c."connectionId" = $1`,
          [connection.id]
        )
      ).rows as { chat: string; id: number }[]
    ).map((row) => `${row.chat}:${row.id}`)
  );

  const stats = {
    personalChats: 0,
    skippedOtherChats: 0,
    chatsWithMessages: 0,
    chatsForAi: 0,
    messages: 0,
    textBytes: 0,
    alreadyStored: 0,
    inserted: 0,
    newChats: 0,
    withdrawalChats: 0,
    chatsWithPhone: 0,
    alerts: {} as Record<string, number>,
    oldest: null as Date | null,
  };
  let batch: PendingChat[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const current = batch;
    batch = [];
    const ids = current.map((chat) => chat.chatId.toString());
    const existing = new Map(
      (
        (
          await pool.query(
            `SELECT id, "chatId"::text AS "chatId", name, profile, tags, "lastMessageAt", "lastDirection", "lastInboundAt", "lastOutboundAt", "createdAt"
             FROM telegram_chat WHERE "connectionId" = $1 AND "chatId" = ANY($2::bigint[])`,
            [connection.id, ids]
          )
        ).rows as {
          id: string;
          chatId: string;
          name: string;
          profile: unknown;
          tags: string[];
          lastMessageAt: Date;
          lastDirection: "IN" | "OUT";
          lastInboundAt: Date | null;
          lastOutboundAt: Date | null;
          createdAt: Date;
        }[]
      ).map((row) => [row.chatId, row])
    );

    // የቻቶቹ ማጠቃለያ (የመጨረሻ መልዕክት፣ ፕሮፋይል፣ ርዕሶች) ከነበረው ጋር ተዋህዶ ይሰላል።
    const chatValues = current.map((chat) => {
      const before = existing.get(chat.chatId.toString());
      const sorted = [...chat.rows].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime() || a.messageId - b.messageId);
      const last = sorted[sorted.length - 1];
      const lastIn = [...sorted].reverse().find((row) => row.direction === "IN")?.sentAt ?? null;
      const lastOut = [...sorted].reverse().find((row) => row.direction === "OUT")?.sentAt ?? null;
      const newer = !before || last.sentAt > before.lastMessageAt;
      const maxDate = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a > b ? a : b);

      let profile: CustomerProfile = readProfile(before?.profile);
      for (const row of sorted) if (row.direction === "IN") profile = mergeProfile(profile, extractContactDetails(row.scanText, row.contactPhone));
      const knownPhone = contactPhones.get(chat.chatId.toString());
      if (knownPhone) profile = mergeProfile(profile, { phones: [knownPhone] });
      profile = { ...profile, phones: profile.phones.filter((phone) => !allow.phones.has(phone)) };
      const withdrawal = sorted.some((row) => mentionsWithdrawal(row.text));
      const tags = withdrawal && !(before?.tags ?? []).includes(WITHDRAWAL_TAG) ? [...(before?.tags ?? []), WITHDRAWAL_TAG] : (before?.tags ?? []);

      if (!before) stats.newChats += 1;
      if (tags.includes(WITHDRAWAL_TAG)) stats.withdrawalChats += 1;
      if (profile.phones.length > 0) stats.chatsWithPhone += 1;
      return {
        chat,
        sorted,
        values: {
          id: before?.id ?? randomUUID(),
          name: before?.name ?? chat.name,
          lastMessageAt: newer ? last.sentAt : before!.lastMessageAt,
          lastDirection: newer ? last.direction : before!.lastDirection,
          lastInboundAt: maxDate(before?.lastInboundAt ?? null, lastIn),
          lastOutboundAt: maxDate(before?.lastOutboundAt ?? null, lastOut),
          createdAt: before && before.createdAt < sorted[0].sentAt ? before.createdAt : sorted[0].sentAt,
          profile,
          tags,
        },
      };
    });

    if (!apply) {
      for (const { chat, sorted } of chatValues) {
        for (const row of sorted) {
          if (row.direction !== "OUT" || existingKeys.has(`${chat.chatId}:${row.messageId}`)) continue;
          for (const finding of findingsFor(row)) stats.alerts[finding.type] = (stats.alerts[finding.type] ?? 0) + 1;
        }
      }
      return;
    }

    // ቻቶቹ፦ አዲስ ከሆኑ ይፈጠራሉ፣ ካሉ ይዘመናሉ።
    const chatParams: unknown[] = [];
    const chatTuples = chatValues.map(({ chat, values }, index) => {
      const base = index * 12;
      chatParams.push(
        values.id,
        connection.id,
        chat.chatId.toString(),
        values.name,
        values.lastMessageAt,
        values.lastDirection,
        values.lastInboundAt,
        values.lastOutboundAt,
        JSON.stringify(values.profile),
        values.tags,
        values.createdAt,
        new Date()
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}::bigint, $${base + 4}, $${base + 5}, $${base + 6}::"TelegramDirection", $${base + 7}, $${base + 8}, $${base + 9}::jsonb, $${base + 10}::text[], $${base + 11}, $${base + 12})`;
    });
    const savedChats = (
      await pool.query(
        `INSERT INTO telegram_chat (id, "connectionId", "chatId", name, "lastMessageAt", "lastDirection", "lastInboundAt", "lastOutboundAt", profile, tags, "createdAt", "updatedAt")
         VALUES ${chatTuples.join(", ")}
         ON CONFLICT ("connectionId", "chatId") DO UPDATE SET
           "lastMessageAt" = EXCLUDED."lastMessageAt", "lastDirection" = EXCLUDED."lastDirection",
           "lastInboundAt" = EXCLUDED."lastInboundAt", "lastOutboundAt" = EXCLUDED."lastOutboundAt",
           profile = EXCLUDED.profile, tags = EXCLUDED.tags, "createdAt" = EXCLUDED."createdAt", "updatedAt" = EXCLUDED."updatedAt"
         RETURNING id, "chatId"::text AS "chatId"`,
        chatParams
      )
    ).rows as { id: string; chatId: string }[];
    const rowIdByChat = new Map(savedChats.map((row) => [row.chatId, row.id]));

    // መልዕክቶቹ፦ ቀድሞ ያሉት (ተመሳሳይ የቴሌግራም መልዕክት ቁጥር) ይዘለላሉ።
    const pendingMessages = chatValues.flatMap(({ chat, sorted }) => sorted.map((row) => ({ chatRowId: rowIdByChat.get(chat.chatId.toString())!, row })));
    const insertedByKey = new Map<string, string>();
    for (let start = 0; start < pendingMessages.length; start += INSERT_ROWS) {
      const slice = pendingMessages.slice(start, start + INSERT_ROWS);
      const params: unknown[] = [];
      const tuples = slice.map(({ chatRowId, row }, index) => {
        const base = index * 11;
        params.push(randomUUID(), chatRowId, row.messageId, row.direction, row.senderName.slice(0, 200), row.text, row.mediaType, row.mimeType, row.sentAt, row.editedAt, false);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::"TelegramDirection", $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
      });
      const inserted = (
        await pool.query(
          `INSERT INTO telegram_message (id, "chatId", "messageId", direction, "senderName", text, "mediaType", "mimeType", "sentAt", "editedAt", "viaBot")
           VALUES ${tuples.join(", ")}
           ON CONFLICT ("chatId", "messageId") DO NOTHING
           RETURNING id, "chatId", "messageId"`,
          params
        )
      ).rows as { id: string; chatId: string; messageId: number }[];
      for (const row of inserted) insertedByKey.set(`${row.chatId}:${row.messageId}`, row.id);
      stats.inserted += inserted.length;
    }

    // የቆዩ የሰራተኛ መልዕክቶች ላይ የሽሽጥ ምልክቶች፤ በመልዕክቱ ቀን ይመዘገባሉ (ወደ ስልክ አይላኩም)።
    const alertRows: { chatRowId: string; messageRowId: string; finding: Finding; at: Date }[] = [];
    for (const { chatRowId, row } of pendingMessages) {
      const messageRowId = insertedByKey.get(`${chatRowId}:${row.messageId}`);
      if (!messageRowId || row.direction !== "OUT") continue;
      for (const finding of findingsFor(row)) alertRows.push({ chatRowId, messageRowId, finding, at: row.sentAt });
    }
    for (let start = 0; start < alertRows.length; start += INSERT_ROWS) {
      const slice = alertRows.slice(start, start + INSERT_ROWS);
      const params: unknown[] = [];
      const tuples = slice.map(({ chatRowId, messageRowId, finding, at }, index) => {
        const base = index * 7;
        params.push(randomUUID(), chatRowId, messageRowId, finding.type, finding.severity, finding.evidence, at);
        stats.alerts[finding.type] = (stats.alerts[finding.type] ?? 0) + 1;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::"TelegramAlertType", $${base + 5}::"TelegramAlertSeverity", $${base + 6}, $${base + 7})`;
      });
      await pool.query(
        `INSERT INTO telegram_alert (id, "chatId", "messageId", type, severity, evidence, "createdAt") VALUES ${tuples.join(", ")}
         ON CONFLICT ("messageId", type, evidence) DO NOTHING`,
        params
      );
    }

    // አዲስ (የቆዩ) መልዕክቶች ያገኙ ቻቶች ሙሉ ታሪካቸውን ይዘው እንደገና ይተነተናሉ።
    const touched = [...new Set([...insertedByKey.keys()].map((key) => key.split(":")[0]))];
    if (touched.length > 0) await pool.query(`UPDATE telegram_chat SET "analyzedAt" = NULL WHERE id = ANY($1::text[])`, [touched]);
  };

  // 3. ቻቶቹ አንድ በአንድ ይነበባሉ።
  let processed = 0;
  for await (const chat of streamPath<ExportChat>("chats.list", "array")) {
    if (chat.type !== "personal_chat") {
      stats.skippedOtherChats += 1;
      continue;
    }
    stats.personalChats += 1;
    const ownerKey = `user${ownerId}`;
    const rows: Row[] = [];
    for (const message of chat.messages ?? []) {
      if (message.type !== "message" || !message.date_unixtime) continue;
      const sentAt = new Date(Number(message.date_unixtime) * 1000);
      if (sentAt < since) continue;
      const { text, scan } = flatten(message.text);
      const contact = message.contact_information;
      const contactText = contact ? `${[contact.first_name, contact.last_name].filter(Boolean).join(" ")} ${contact.phone_number ?? ""}`.trim() : "";
      const media = mediaOf(message);
      rows.push({
        messageId: message.id,
        direction: message.from_id === ownerKey ? "OUT" : "IN",
        senderName: message.from ?? chat.name ?? "",
        text: text || contactText || (message.sticker_emoji ?? ""),
        scanText: [scan, contactText].filter(Boolean).join("\n"),
        contactPhone: contact?.phone_number,
        ...media,
        sentAt,
        editedAt: message.edited_unixtime ? new Date(Number(message.edited_unixtime) * 1000) : null,
      });
      if (existingKeys.has(`${chat.id}:${message.id}`)) stats.alreadyStored += 1;
      stats.textBytes += Buffer.byteLength(text);
      if (!stats.oldest || sentAt < stats.oldest) stats.oldest = sentAt;
    }
    if (rows.length === 0) continue;
    stats.chatsWithMessages += 1;
    stats.messages += rows.length;
    if (rows.length >= 2) stats.chatsForAi += 1;
    batch.push({ chatId: BigInt(chat.id), name: chat.name || `User ${chat.id}`, rows });
    if (batch.length >= BATCH_CHATS) {
      await flush();
      processed += BATCH_CHATS;
      process.stdout.write(`\r  ${processed} chats processed…`);
    }
  }
  await flush();
  process.stdout.write("\n");

  // 4. ማጠቃለያ
  const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
  const estimatedBytes = stats.messages * 350 + stats.textBytes;
  console.log(`Personal chats in export: ${stats.personalChats} (other chats skipped: ${stats.skippedOtherChats})`);
  console.log(`Chats with messages in range: ${stats.chatsWithMessages} (new: ${stats.newChats})`);
  console.log(`Messages in range: ${stats.messages}${stats.oldest ? `, oldest ${stats.oldest.toISOString().slice(0, 10)}` : ""}`);
  console.log(`Already stored (same Telegram message number): ${stats.alreadyStored} of ${existingKeys.size} stored messages`);
  console.log(`Estimated database space: ~${megabytes(estimatedBytes)} MB`);
  console.log(`Chats with 2+ messages for AI analysis: ${stats.chatsForAi} (≈ $${(stats.chatsForAi * 0.001).toFixed(2)} with claude-haiku-5-5)`);
  console.log(`Withdrawal folder: ${stats.withdrawalChats} chats · chats with a phone number: ${stats.chatsWithPhone}`);
  console.log(`${apply ? "Alerts saved" : "Alerts that would be saved"} from old staff messages: ${JSON.stringify(stats.alerts)}`);
  if (apply) console.log(`Inserted messages: ${stats.inserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
