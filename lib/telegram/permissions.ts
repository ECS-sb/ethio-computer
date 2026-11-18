// ሰራተኞች በአድሚን ገጾች (ማርኬቱና ቴሌግራም) ላይ ምን ማየትና ማድረግ እንደሚችሉ። አድሚኑ ለእያንዳንዱ ሰራተኛ ያበራል/ያጠፋል። ምንም database አይጠቀምም።
import type { MessageKey } from "@/lib/messages";

/**
 * ነባሪዎቹ (defaultOn) ሰራተኛው ስራውን እንዲሰራ የሚያስፈልገውን ያበራሉ፤ የድርጅቱን ትርፍ፣ የሽያጭ ገጹን እና
 * ሽሽጥን የሚያጋልጡ ማስጠንቀቂያዎችን (የተሰረዙ/የተቀየሩ መልዕክቶችን ጨምሮ) ይደብቃሉ።
 * የማርኬቱ ፈቃዶች በሙሉ በነባሪ ጠፍተዋል፤ የቆዩ የቴሌግራም ሰራተኞች አድሚኑ ሳያበራላቸው ምንም አዲስ ነገር አያዩም።
 */
export const PERMISSIONS = [
  { id: "listings", group: "market", label: "Review listings", hint: "Approve or reject new listings.", defaultOn: false },
  { id: "orders", group: "market", label: "See orders", hint: "The order list, and recording agent handovers.", defaultOn: false },
  { id: "ordersDecide", group: "market", label: "Complete or cancel orders", hint: "Releases the money to the seller or refunds the buyer.", defaultOn: false },
  { id: "deposits", group: "market", label: "Approve deposits", hint: "Sees receipt photos and adds money to wallets.", defaultOn: false },
  { id: "withdrawals", group: "market", label: "Approve withdrawals", hint: "Sees bank details and marks withdrawals as paid.", defaultOn: false },
  { id: "verifications", group: "market", label: "Verify sellers", hint: "Sees ID photos, ID numbers and bank details.", defaultOn: false },
  { id: "reports", group: "market", label: "Handle reports", hint: "Reports, contact messages and blocked chat attempts.", defaultOn: false },
  { id: "users", group: "market", label: "See and suspend users", hint: "The user list with wallet balances, suspending users and the verified badge.", defaultOn: false },
  { id: "chats", group: "telegram", label: "Read chats", hint: "Without this the staff member can't open the Telegram page at all.", defaultOn: true },
  { id: "customerDetails", group: "telegram", label: "See customer details", hint: "Phone numbers, emails and accounts in the eye window.", defaultOn: true },
  { id: "aiSummary", group: "telegram", label: "See AI summaries and deals", hint: "What happened in the chat and the deals AI found.", defaultOn: true },
  { id: "analytics", group: "telegram", label: "See the stats row", hint: "Messages, replies and reply time at the top.", defaultOn: true },
  { id: "channels", group: "telegram", label: "See and link channels", hint: "Which seller a channel came from and which buyer it goes to, without purchase prices.", defaultOn: true },
  { id: "reply", group: "telegram", label: "Reply from the website", hint: "Coming next. Messages they send will show their name.", defaultOn: true },
  { id: "profit", group: "telegram", label: "See purchase prices and profit", hint: "What the company paid sellers, the profit and the Channels & profit page.", defaultOn: false },
  { id: "sales", group: "telegram", label: "See the sales page", hint: "All sales and payments found by AI.", defaultOn: false },
  { id: "alerts", group: "telegram", label: "See alerts and deleted messages", hint: "Side-deal alerts, deleted messages and text before edits.", defaultOn: false },
] as const satisfies readonly { id: string; group: "market" | "telegram"; label: MessageKey; hint: MessageKey; defaultOn: boolean }[];

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

/** ሰራተኛው የሚያያቸው የአድሚን ገጾች (በምናሌው ቅደም ተከተል)። የመጀመሪያው ሲገባ የሚያርፍበት ገጽ ነው። */
export function staffPages(can: Permissions): string[] {
  return [
    ...(can.listings ? ["/admin/listings"] : []),
    ...(can.orders || can.ordersDecide ? ["/admin/orders"] : []),
    ...(can.deposits || can.withdrawals ? ["/admin/wallet"] : []),
    ...(can.verifications ? ["/admin/verifications"] : []),
    ...(can.users ? ["/admin/users"] : []),
    ...(can.reports ? ["/admin/reports"] : []),
    ...(can.chats ? ["/admin/telegram"] : []),
    ...(can.chats && can.sales ? ["/admin/telegram/sales"] : []),
    ...(can.chats && can.profit ? ["/admin/telegram/channels"] : []),
    "/admin/password",
  ];
}
