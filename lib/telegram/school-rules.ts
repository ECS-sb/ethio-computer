// የትምህርት ቤቱ ቴሌግራም ህጎች፦ የምዝገባ ሊንክ፣ "ተመዝግቤያለሁ" ማለት፣ የስራ ሰዓት እና ተማሪው ያለበት ደረጃ። ምንም database አይጠቀምም።
import type { MessageKey } from "@/lib/messages";

/** ተማሪዎች የሚመዘገቡበት ድረ-ገጽ፤ ሰራተኛው ይህንን ሊንክ ሲልክ "ሊንክ ተልኳል" ይቆጠራል። */
export const SCHOOL_SITE_HOST = (process.env.SCHOOL_SITE_HOST || "ethiocomputer.school").toLowerCase();

/**
 * ተማሪው "ተመዝግቤያለሁ" ሲል (PostgreSQL ~* እና JavaScript ሁለቱም ይረዱታል)። "ልመዘገብ"፣ "መመዝገብ እፈልጋለሁ" አይቆጠሩም፤
 * "ተመዝግ…" (ያለፈ ጊዜ) ብቻ ነው የሚቆጠረው።
 */
export const REGISTERED_PATTERN = "ተመዝግ|ተመዝገብኩ|registered|signed up|i have register|i've register";

/** ዋጋ ወይም ክፍያ የጠየቀ ሰው "ፍላጎት አለው" ይባላል። (PostgreSQL \b የቃል ወሰን ስላልሆነ አልተጠቀምንበትም።) */
export const INTERESTED_PATTERN = "ዋጋ|ስንት ነው|ስንት ብር|ክፍያ|መመዝገብ|ልመዘገብ|price|how much|cost|register|enroll";

const registered = new RegExp(REGISTERED_PATTERN, "i");

export function mentionsSchoolLink(text: string): boolean {
  return text.toLowerCase().includes(SCHOOL_SITE_HOST);
}

export function saysRegistered(text: string): boolean {
  return registered.test(text);
}

// ---- የስራ ሰዓት (የአዲስ አበባ ሰዓት፤ UTC+3፣ የበጋ/የክረምት ለውጥ የለውም)

const ADDIS_OFFSET_MINUTES = 3 * 60;

export function addisMinuteOfDay(date: Date): number {
  return (Math.floor(date.getTime() / 60000) + ADDIS_OFFSET_MINUTES) % (24 * 60);
}

/** start ≤ ሰዓቱ < end፤ end < start ከሆነ ሰዓቱ እኩለ ሌሊቱን ያልፋል (ለምሳሌ 20:00–02:00)። */
export function inShift(minute: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/** "08:30" → 510፤ ባዶ ወይም የተሳሳተ ከሆነ null። */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function formatClock(minute: number | null): string {
  if (minute === null) return "";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

// ---- ተማሪው ያለበት ደረጃ (ለማርኬቲንግ)

export const STAGES = ["new", "interested", "linkSent", "registered", "paid", "quiet"] as const;
export type Stage = (typeof STAGES)[number];

/** የማርኬቲንግ ቡድኖች፦ ደረጃዎቹ፣ ክትትል የሚያስፈልጋቸው እና ሁሉም። */
export const SEGMENTS = ["all", "followUp", ...STAGES] as const;
export type Segment = (typeof SEGMENTS)[number];

export function isSegment(value: string): value is Segment {
  return (SEGMENTS as readonly string[]).includes(value);
}

export const segmentLabels: Record<Segment, MessageKey> = {
  all: "All students",
  followUp: "Need follow-up",
  new: "New",
  interested: "Interested",
  linkSent: "About to buy",
  registered: "Registered",
  paid: "Paid",
  quiet: "Gone quiet",
};

export const segmentHints: Record<Segment, MessageKey> = {
  all: "Everyone who has written to the school's Telegram.",
  followUp: "Interested, sent the link or registered but not paid, and nobody wrote for over a day.",
  new: "Wrote for the first time in the last 7 days and hasn't asked about a course yet.",
  interested: "Asked about prices or how to register, but hasn't been sent the link yet.",
  linkSent: "Staff sent the registration link, but the student hasn't said they registered.",
  registered: "Said they registered (or agreed), but no payment has been seen yet.",
  paid: "Paid: a receipt to the company or a paid registration was found.",
  quiet: "No message for 30 days and never paid.",
};

const DAY = 24 * 60 * 60 * 1000;

export type StudentFacts = {
  createdAt: Date;
  lastMessageAt: Date;
  paid: boolean;
  agreed: boolean;
  linkAt: Date | null;
  confirmedAt: Date | null;
  interested: boolean;
};

export function stageOf(facts: StudentFacts, now = new Date()): Stage {
  if (facts.paid) return "paid";
  if (facts.agreed || (facts.confirmedAt && (!facts.linkAt || facts.confirmedAt >= facts.linkAt))) return "registered";
  if (now.getTime() - facts.lastMessageAt.getTime() > 30 * DAY) return "quiet";
  if (facts.linkAt) return "linkSent";
  if (facts.interested) return "interested";
  return now.getTime() - facts.createdAt.getTime() <= 7 * DAY ? "new" : "quiet";
}

/** ክትትል የሚያስፈልገው፦ ገና ያልከፈለ፣ ፍላጎት ያሳየ፣ እና ከአንድ ቀን በላይ (ከ30 ቀን በታች) ማንም ያልጻፈበት። */
export function needsFollowUp(stage: Stage, lastMessageAt: Date, now = new Date()): boolean {
  if (stage !== "interested" && stage !== "linkSent" && stage !== "registered") return false;
  const idle = now.getTime() - lastMessageAt.getTime();
  return idle > DAY && idle <= 30 * DAY;
}

export function inSegment(segment: Segment, stage: Stage, followUp: boolean): boolean {
  return segment === "all" || (segment === "followUp" ? followUp : segment === stage);
}

/** የማርኬቲንግ መልዕክቱ {name} በተማሪው የመጀመሪያ ስም ይተካል። */
export function personalize(text: string, name: string): string {
  const first = name.trim().split(/\s+/)[0] || "";
  return text.replace(/\{name\}/g, first);
}
