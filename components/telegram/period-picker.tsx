"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClockIcon, ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { saveLayoutPref } from "@/lib/telegram/layout-prefs";
import { parsePeriod, PERIOD_COOKIE, periodLabel, PERIODS, type PeriodId } from "@/lib/telegram/periods";
import { telegramTheme } from "@/lib/telegram/theme";

/** ቁጥሮቹ የሚቆጠሩበትን ጊዜ የሚቀይር አንድ አዝራር (1 ሰዓት … 6 ወር)። ምርጫው በcookie ይታወሳል፣ ቁጥሮቹ ከሰርቨር ይታደሳሉ። */
export function PeriodPicker({ initialPeriod }: { initialPeriod: PeriodId }) {
  const t = useT();
  const router = useRouter();
  const [period, setPeriod] = useState(initialPeriod);
  const [pending, startTransition] = useTransition();

  const choose = (value: string) => {
    const next = parsePeriod(value);
    setPeriod(next);
    saveLayoutPref(PERIOD_COOKIE, next);
    startTransition(() => router.refresh());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("Time period: {period}", { period: t(periodLabel(period)) })}
        className="flex shrink-0 cursor-pointer flex-col items-start rounded-xl bg-card px-4 py-3 text-start ring-1 ring-foreground/10 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary sm:min-w-32"
      >
        <span className="flex items-center gap-1.5 text-xl font-semibold text-[var(--tg-link,var(--primary))]">
          {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CalendarClockIcon className="size-4" />}
          {t(periodLabel(period))}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </span>
        <span className="text-xs text-muted-foreground">{t("Time period")}</span>
      </DropdownMenuTrigger>
      {/* ሜኑው ከገጹ ውጭ (portal) ስለሚከፈት የቴሌግራም ቀለሞችን ራሱ ይወስዳል። */}
      <DropdownMenuContent align="start" className="w-44" style={telegramTheme}>
        <DropdownMenuRadioGroup value={period} onValueChange={choose}>
          {PERIODS.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id} closeOnClick className="py-1.5">
              {t("Last {period}", { period: t(option.label) })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
