/**
 * ቻትና የዋጋ ቅናሽ መልዕክቶች ውስጥ ገዢና ሻጭ ከሳይቱ ውጪ እንዲገናኙ የሚያደርግ ነገር ካለ ይይዛል፦
 * ስልክ ቁጥር (በቃላት የተጻፈም)፣ ኢሜይል፣ ሊንክ፣ @username፣ ሌላ መተግበሪያ፣ ከሳይቱ ውጪ ክፍያ።
 * የተያዘ መልዕክት ለተቀባዩ አይደርስም፤ ላኪው ማስጠንቀቂያ ያገኛል (lib/marketplace.ts → sendMessage)።
 */

export type ChatBlockReason = "PHONE" | "EMAIL" | "LINK" | "USERNAME" | "OTHER_APP" | "OFF_SITE_PAYMENT";

/** ከስንተኛው ሙከራ በኋላ አካውንቱ በራሱ ይታገዳል። */
export const MAX_CHAT_STRIKES = 3;

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ዜሮ: "0",
  አንድ: "1",
  ሁለት: "2",
  ሶስት: "3",
  ሦስት: "3",
  አራት: "4",
  አምስት: "5",
  ስድስት: "6",
  ሰባት: "7",
  ስምንት: "8",
  ዘጠኝ: "9",
};
const NUMBER_WORD_PATTERN = new RegExp(`(${Object.keys(NUMBER_WORDS).join("|")})`, "giu");

// የኢትዮጵያ ሞባይል፦ +251/251/0 ቀጥሎ 9 ወይም 7 እና 8 አሃዝ፣ ወይም ያለ ቅድመ ቁጥር 9 አሃዝ። በመሃል አንድ ክፍተት/ነጥብ/ሰረዝ ይፈቀዳል።
const PHONE_PATTERNS = [
  /(?<!\d)(?:\+?\s?2[\s.-]?5[\s.-]?1|0)[\s.-]?[79](?:[\s.-]?\d){8}(?![\s.-]?\d)/u,
  /(?<!\d)[79](?:[\s.-]?\d){8}(?![\s.-]?\d)/u,
  // ረጅም ተከታታይ አሃዝ (የባንክ ሂሳብ፣ የውጭ ስልክ)፤ "150,000" የመሰሉ ዋጋዎች አይያዙም።
  /(?<![\d,])\d{10,}(?![\d,])/u,
];

const EMAIL_PATTERNS = [/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+\.[a-z]{2,}/iu, /\b(?:at\s+)?(?:gmail|yahoo|outlook|hotmail)\s*(?:dot\s*|\.\s*)?com\b/iu, /ጂሜል/u];

const LINK_PATTERNS = [
  /\bhttps?:\/\//iu,
  /\bwww\./iu,
  /\b(?:t|wa|bit|tinyurl|linktr)\s*\.\s*(?:me|ly|com|ee)\b/iu,
  /\b[\p{L}\p{N}-]{2,}\s*\.\s*(?:com|net|org|me|et|io|co|link|ly|gg|app|xyz|info)\b/iu,
];

const USERNAME_PATTERN = /(?<![\p{L}\p{N}_@])@([A-Za-z0-9_.]{3,})/gu;

// ፕላትፎርሞቹ ራሳቸው (Telegram፣ Instagram…) የሚሸጡ ዕቃዎች ስለሆኑ ስማቸው ብቻ አይያዝም፤ የሚያዙት "እዚያ እንገናኝ" የሚሉ አገላለጾች ናቸው።
const OTHER_APP_PATTERNS = [
  /\b(?:whats\s?app|watsapp|watsap|viber|imo|messenger|wechat|botim)\b/iu,
  /ዋትሳፕ|ዋትስአፕ|ዋትስ\s?አፕ|ቫይበር|ኢሞ(?![\p{L}])/u,
  /\b(?:on|in|via|through|use|add\s+me\s+on|find\s+me\s+on)\s+(?:telegram|tg|insta(?:gram)?|tiktok|facebook|fb|signal)\b/iu,
  /\b(?:telegram|tg|insta(?:gram)?|tiktok|facebook|fb)\s+(?:me|lay|ላይ)\b/iu,
  /(?:ቴሌግራም|ቴሌ|ኢንስታ(?:ግራም)?|ቲክቶክ|ፌስቡክ)\s*ላይ\s*(?:ና|ኑ|ጻፍ|ጻፊ|ጻፉ|ላክ|ላኪ|ላኩ|እንገናኝ|አግኘኝ|አግኙኝ|ጠብቀኝ)/u,
  /\b(?:dm|inbox|text|call|phone|ring)\s+me\b/iu,
  /\b(?:my|your|ur)\s+(?:phone|number|telegram|whatsapp|contact)\b/iu,
  /\bphone\s+number\b/iu,
  /ደውል(?:ልኝ|ይልኝ|ሉልኝ|ልን)|ይደውሉ(?:ልኝ)?|ደውልልን|ስልክ\s*ቁጥር|ስልክህን|ስልክሽን|ስልካችሁን|ስልኬ|ቁጥርህን|ቁጥርሽን|ቁጥሬ/u,
];

const OFF_SITE_PAYMENT_PATTERNS = [
  /\b(?:pay|send|transfer)\s+(?:me|it\s+to\s+me|the\s+money\s+to\s+me)\s*(?:directly|direct|privately|outside)?\b/iu,
  /\b(?:outside|off)\s+(?:the\s+)?(?:site|website|platform|app)\b/iu,
  /\b(?:account|acc)\s*(?:number|no\.?)\b/iu,
  /\b(?:tele\s?birr|cbe\s?birr|m-?pesa|awash\s?birr|amole)\b/iu,
  /ቴሌብር|ሲቢኢ\s*ብር|ኤምፔሳ|ከሳይቱ\s*ውጪ|ከዌብሳይቱ\s*ውጪ|በቀጥታ\s*(?:ክፈል|ክፈይ|ክፈሉ|ላክ|ላኪ|ላኩ)|ቀጥታ\s*(?:ክፈል|ክፈይ|ላክ|ላኪ)|(?:ሂሳብ|አካውንት)\s*ቁጥር/u,
];

/** ስራ ማስረከቢያ ሊንኮች (ለምሳሌ Google Drive) ይፈቀዳሉ፦ ከተፈቀዱት አድራሻዎች አንዱ የሆነ https ሊንክ ከጽሑፉ ይወጣል፤ ሌላው ሁሉ እንደተለመደው ይፈተሻል። */
export function stripAllowedLinks(text: string, hosts: readonly string[]): string {
  if (hosts.length === 0) return text;
  return text.replace(/https:\/\/[^\s<>"']+/giu, (url) => (isAllowedLink(url, hosts) ? " " : url));
}

export function isAllowedLink(url: string, hosts: readonly string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function spellOutNumbers(text: string): string {
  return text.replace(NUMBER_WORD_PATTERN, (word) => NUMBER_WORDS[word.toLowerCase()] ?? word);
}

/**
 * መልዕክቱ መታገድ ካለበት ምክንያቱን ይመልሳል፣ ካልሆነ null።
 * allowedHandles፦ የሚሸጠው አካውንት ራሱ ስም (በማስታወቂያው ላይ በግልጽ ስለሚታይ አይያዝም)።
 */
export function findBlockedContent(body: string, allowedHandles: string[] = [], options: { allowedLinkHosts?: readonly string[] } = {}): ChatBlockReason | null {
  const text = stripAllowedLinks(body.normalize("NFKC"), options.allowedLinkHosts ?? []);
  if (EMAIL_PATTERNS.some((pattern) => pattern.test(text))) return "EMAIL";
  if (LINK_PATTERNS.some((pattern) => pattern.test(text))) return "LINK";

  const allowed = new Set(allowedHandles.map((handle) => handle.replace(/^@/, "").toLowerCase()));
  for (const match of text.matchAll(USERNAME_PATTERN)) {
    if (!allowed.has(match[1].toLowerCase())) return "USERNAME";
  }

  const digits = spellOutNumbers(text);
  if (PHONE_PATTERNS.some((pattern) => pattern.test(digits))) return "PHONE";
  if (OFF_SITE_PAYMENT_PATTERNS.some((pattern) => pattern.test(text))) return "OFF_SITE_PAYMENT";
  if (OTHER_APP_PATTERNS.some((pattern) => pattern.test(text))) return "OTHER_APP";
  return null;
}
