// የሰብስክሪፕሽን ገበያው ቋሚ መረጃዎች (ምድቦች፣ ሁኔታዎች፣ የዋጋ ስሌት)። database አይጠቀምም፤ በclient ኮምፖነንቶችም ይሰራል።
import type { SubscriptionCategory, SubscriptionInfo, SubscriptionOrderStatus } from "@/lib/generated/prisma/enums";
import type { MessageKey } from "@/lib/messages";

export const subscriptionCategories: { value: SubscriptionCategory; label: MessageKey; hint: MessageKey }[] = [
  { value: "VPN", label: "VPN", hint: "Private, fast internet and access to blocked apps." },
  { value: "SOCIAL", label: "Social media", hint: "Premium and verified badges for your social accounts." },
  { value: "AI", label: "AI tools", hint: "Chat assistants, image makers and coding helpers." },
  { value: "STREAMING", label: "Movies and music", hint: "Films, series and music without ads." },
  { value: "CREATIVE", label: "Design and editing", hint: "Tools for thumbnails, videos and graphics." },
  { value: "PRODUCTIVITY", label: "Cloud and office", hint: "Storage, office apps, meetings and learning." },
  { value: "GAMING", label: "Gaming", hint: "Online play and game libraries." },
  { value: "DEVELOPER", label: "Developer accounts", hint: "Publish your apps on the App Store and Google Play." },
  { value: "OTHER", label: "Others", hint: "Other subscriptions we can pay for you." },
];

export function subscriptionCategory(value: string) {
  return subscriptionCategories.find((category) => category.value === value);
}

/** ለማስገባት ከደንበኛው የሚጠየቀው መረጃ። */
export const infoFields: Record<SubscriptionInfo, { label: MessageKey; placeholder: string; type: "email" | "text" | "tel" } | null> = {
  EMAIL: { label: "The email of the account to activate", placeholder: "you@gmail.com", type: "email" },
  USERNAME: { label: "Your username on this app", placeholder: "@username", type: "text" },
  PHONE: { label: "The phone number of the account", placeholder: "09…", type: "tel" },
  NONE: null,
};

export const subscriptionInfoOptions: { value: SubscriptionInfo; label: MessageKey }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "USERNAME", label: "Username" },
  { value: "PHONE", label: "Phone number" },
  { value: "NONE", label: "Nothing (we send a code or login)" },
];

export const subscriptionStatusLabels: Record<SubscriptionOrderStatus, MessageKey> = {
  AWAITING_PAYMENT: "Waiting for payment",
  PAID: "Paid, we're activating it",
  DELIVERED: "Activated",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const SETTING_USD_RATE = "subscriptions.usdRate";
export const SETTING_MARKUP = "subscriptions.markupPercent";

export type PriceSettings = { usdRate: number; markupPercent: number };

/**
 * የእቅዱ ዋጋ በብር፦ አድሚኑ ቋሚ ዋጋ ካስቀመጠ እሱ፣ ካልሆነ ዶላር × ተመን × (1 + ትርፍ)፣ ወደ ላይ በ10 ብር ተጠግቶ።
 * ተመኑ ገና ካልተቀመጠ null ይመልሳል (እቅዱ አይሸጥም)።
 */
export function planPriceEtb(plan: { usdCents: number; priceEtb: number | null }, settings: PriceSettings): number | null {
  if (plan.priceEtb && plan.priceEtb > 0) return plan.priceEtb;
  if (settings.usdRate <= 0 || plan.usdCents <= 0) return null;
  const raw = (plan.usdCents / 100) * settings.usdRate * (1 + settings.markupPercent / 100);
  return Math.ceil(raw / 10) * 10;
}

/** የአገልግሎቱ ስም የመጀመሪያ ፊደላት (ለትንሹ ምልክት)። */
export function serviceMark(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
