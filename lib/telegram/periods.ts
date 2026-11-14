// ከላይ ያሉት ቁጥሮች የሚቆጠሩበት ጊዜ (ባለፈው 1 ሰዓት … 6 ወር)። ምርጫው በcookie ይታወሳል። ምንም database አይጠቀምም።

const HOUR = 60 * 60 * 1000;

export const PERIODS = [
  { id: "1h", hours: 1, label: "1 hour" },
  { id: "1d", hours: 24, label: "1 day" },
  { id: "7d", hours: 24 * 7, label: "1 week" },
  { id: "30d", hours: 24 * 30, label: "1 month" },
  { id: "90d", hours: 24 * 90, label: "3 months" },
  { id: "180d", hours: 24 * 180, label: "6 months" },
] as const;

export type PeriodId = (typeof PERIODS)[number]["id"];

export const PERIOD_COOKIE = "tg_period";
export const DEFAULT_PERIOD: PeriodId = "1d";

export function parsePeriod(value: string | undefined): PeriodId {
  return PERIODS.some((period) => period.id === value) ? (value as PeriodId) : DEFAULT_PERIOD;
}

export type PeriodLabel = (typeof PERIODS)[number]["label"];

export function periodLabel(id: PeriodId): PeriodLabel {
  return PERIODS.find((period) => period.id === id)?.label ?? "1 day";
}

export function periodStart(id: PeriodId, now = new Date()): Date {
  const hours = PERIODS.find((period) => period.id === id)?.hours ?? 24;
  return new Date(now.getTime() - hours * HOUR);
}
