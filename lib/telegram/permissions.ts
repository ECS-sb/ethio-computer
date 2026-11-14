// ሰራተኞች በቴሌግራም ገጾች ላይ ምን ማየትና ማድረግ እንደሚችሉ። አድሚኑ ለእያንዳንዱ ሰራተኛ ያበራል/ያጠፋል። ምንም database አይጠቀምም።
import type { MessageKey } from "@/lib/messages";

/**
 * ነባሪዎቹ (defaultOn) ሰራተኛው ስራውን እንዲሰራ የሚያስፈልገውን ያበራሉ፤ የድርጅቱን ትርፍ፣ የሽያጭ ገጹን እና
 * ሽሽጥን የሚያጋልጡ ማስጠንቀቂያዎችን (የተሰረዙ/የተቀየሩ መልዕክቶችን ጨምሮ) ይደብቃሉ።
 */
export const PERMISSIONS = [
  { id: "chats", label: "Read chats", hint: "Without this the staff member can't open the Telegram page at all.", defaultOn: true },
  { id: "customerDetails", label: "See customer details", hint: "Phone numbers, emails and accounts in the eye window.", defaultOn: true },
  { id: "aiSummary", label: "See AI summaries and deals", hint: "What happened in the chat and the deals AI found.", defaultOn: true },
  { id: "analytics", label: "See the stats row", hint: "Messages, replies and reply time at the top.", defaultOn: true },
  { id: "channels", label: "See and link channels", hint: "Which seller a channel came from and which buyer it goes to, without purchase prices.", defaultOn: true },
  { id: "reply", label: "Reply from the website", hint: "Coming next. Messages they send will show their name.", defaultOn: true },
  { id: "profit", label: "See purchase prices and profit", hint: "What the company paid sellers, the profit and the Channels & profit page.", defaultOn: false },
  { id: "sales", label: "See the sales page", hint: "All sales and payments found by AI.", defaultOn: false },
  { id: "alerts", label: "See alerts and deleted messages", hint: "Side-deal alerts, deleted messages and text before edits.", defaultOn: false },
] as const satisfies readonly { id: string; label: MessageKey; hint: MessageKey; defaultOn: boolean }[];

export type Permission = (typeof PERMISSIONS)[number]["id"];
export type Permissions = Record<Permission, boolean>;

export function isPermission(value: string): value is Permission {
  return PERMISSIONS.some((permission) => permission.id === value);
}

/** ከdatabase የመጣውን JSON ያነባል፤ ያልተቀመጠ ፈቃድ ነባሪውን ይወስዳል (አዲስ ፈቃድ ሲጨመርም ይሰራል)። */
export function resolvePermissions(json: unknown): Permissions {
  const stored = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  return Object.fromEntries(PERMISSIONS.map((permission) => [permission.id, typeof stored[permission.id] === "boolean" ? stored[permission.id] : permission.defaultOn])) as Permissions;
}

export const ALL_PERMISSIONS = Object.fromEntries(PERMISSIONS.map((permission) => [permission.id, true])) as Permissions;
