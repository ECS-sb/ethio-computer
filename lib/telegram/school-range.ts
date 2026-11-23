// የትንታኔው የቀን ክልል በአዲስ አበባ ቀኖች (UTC+3)፦ ?from=2026-11-01&to=2026-11-22 ወይም ?range=7d። ምንም database አይጠቀምም።
import type { MessageKey } from "@/lib/messages";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const OFFSET = 3 * HOUR;
const MAX_DAYS = 366;

export const RANGE_PRESETS = ["today", "yesterday", "7d", "30d", "month", "90d"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const presetLabels: Record<RangePreset, MessageKey> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "90d": "Last 3 months",
};

export type DateRange = {
  /** የመጀመሪያው ቀን መጀመሪያ */
  from: Date;
  /** ከመጨረሻው ቀን ቀጥሎ ያለው ቀን መጀመሪያ (አይካተትም) */
  to: Date;
  fromKey: string;
  toKey: string;
  preset: RangePreset | null;
  days: string[];
};

/** የአዲስ አበባ ቀኑ መለያ (2026-11-22)። */
export function addisDayKey(date: Date): string {
  return new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
}

/** "2026-11-22" የአዲስ አበባ ቀን መጀመሪያ፤ የተሳሳተ ከሆነ null። */
function dayStart(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const time = Date.parse(`${key}T00:00:00Z`);
  return Number.isNaN(time) ? null : new Date(time - OFFSET);
}

function build(from: Date, to: Date, preset: RangePreset | null): DateRange {
  const days: string[] = [];
  for (let time = from.getTime(); time < to.getTime(); time += DAY) days.push(addisDayKey(new Date(time)));
  return { from, to, fromKey: days[0], toKey: days[days.length - 1], preset, days };
}

export function presetRange(preset: RangePreset, now = new Date()): DateRange {
  const today = dayStart(addisDayKey(now)) as Date;
  const tomorrow = new Date(today.getTime() + DAY);
  switch (preset) {
    case "today":
      return build(today, tomorrow, preset);
    case "yesterday":
      return build(new Date(today.getTime() - DAY), today, preset);
    case "7d":
      return build(new Date(today.getTime() - 6 * DAY), tomorrow, preset);
    case "30d":
      return build(new Date(today.getTime() - 29 * DAY), tomorrow, preset);
    case "90d":
      return build(new Date(today.getTime() - 89 * DAY), tomorrow, preset);
    case "month":
      return build(dayStart(`${addisDayKey(now).slice(0, 7)}-01`) as Date, tomorrow, preset);
  }
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** ከአድራሻው ክልሉን ያነባል፤ የተሳሳተ ወይም ከ366 ቀን የሚበልጥ ከሆነ ያለፉት 7 ቀናት። */
export function parseRange(params: SearchParams, now = new Date()): DateRange {
  const preset = first(params.range);
  if ((RANGE_PRESETS as readonly string[]).includes(preset)) return presetRange(preset as RangePreset, now);
  const from = dayStart(first(params.from));
  const toDay = dayStart(first(params.to));
  if (from && toDay && toDay >= from) {
    const to = new Date(toDay.getTime() + DAY);
    if ((to.getTime() - from.getTime()) / DAY <= MAX_DAYS) return build(from, to, null);
  }
  return presetRange("7d", now);
}

export function rangeQuery(range: Pick<DateRange, "preset" | "fromKey" | "toKey">): string {
  return range.preset ? `?range=${range.preset}` : `?from=${range.fromKey}&to=${range.toKey}`;
}
