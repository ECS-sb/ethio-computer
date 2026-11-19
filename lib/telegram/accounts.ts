// የድርጅቱ የቴሌግራም አካውንቶች በምድብ፦ የሽያጩ እና የትምህርት ቤቱ (e-learning)። ሰራተኞች የተፈቀደላቸውን ምድብ ብቻ ያያሉ። ምንም database አይጠቀምም።
import type { MessageKey } from "@/lib/messages";
import type { Permission, Permissions } from "@/lib/telegram/permissions";

export const ACCOUNT_CATEGORIES = ["sales", "school"] as const;
export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];
export type DbAccountCategory = "SALES" | "SCHOOL";

export const categoryLabels: Record<AccountCategory, MessageKey> = { sales: "Sales Telegram", school: "School Telegram" };

const permissionFor: Record<AccountCategory, Permission> = { sales: "salesAccount", school: "schoolAccount" };

export function toDbCategory(category: AccountCategory): DbAccountCategory {
  return category === "school" ? "SCHOOL" : "SALES";
}

export function fromDbCategory(category: DbAccountCategory): AccountCategory {
  return category === "SCHOOL" ? "school" : "sales";
}

export function isAccountCategory(value: string): value is AccountCategory {
  return (ACCOUNT_CATEGORIES as readonly string[]).includes(value);
}

/** ሰራተኛው ማየት የሚችላቸው ምድቦች (አድሚኑ ሁሉንም)። */
export function allowedCategories(can: Permissions): AccountCategory[] {
  return ACCOUNT_CATEGORIES.filter((category) => can[permissionFor[category]]);
}

export function canSeeCategory(can: Permissions, category: DbAccountCategory | AccountCategory): boolean {
  const id = category === "SCHOOL" || category === "school" ? "school" : "sales";
  return can[permissionFor[id]];
}

/** የተጠየቀው ምድብ ካልተፈቀደ (ወይም ካልተጠየቀ) የመጀመሪያው የተፈቀደው፤ ምንም ካልተፈቀደ null። */
export function resolveCategory(requested: string, can: Permissions): AccountCategory | null {
  const allowed = allowedCategories(can);
  return allowed.find((category) => category === requested) ?? allowed[0] ?? null;
}
