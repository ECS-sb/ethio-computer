"use client";

import { useState, useTransition } from "react";
import { GraduationCapIcon, LoaderCircleIcon, MegaphoneIcon, XIcon } from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { schoolQuickStatsAction, type SchoolQuickStats } from "@/lib/actions";
import { formatPrice } from "@/lib/catalog";
import { SCHOOL_ANALYTICS, SCHOOL_MARKETING } from "@/lib/telegram/permissions";
import { segmentLabels, type Segment } from "@/lib/telegram/school-rules";
import { telegramTheme } from "@/lib/telegram/theme";

const QUICK_SEGMENTS: Segment[] = ["followUp", "linkSent", "registered", "paid"];

/**
 * ከትምህርት ቤቱ ቴሌግራም ጎን ያለው ትንሽ አዝራር፦ የዛሬውን በሰራተኛ (መልሶች፣ ሊንኮች፣ ምዝገባ፣ ብር) እና የተማሪዎቹን ቡድኖች ያሳያል።
 * ቁጥሮቹ የሚጠየቁት መስኮቱ ሲከፈት ብቻ ነው።
 */
export function SchoolQuickStats({ canMarketing }: { canMarketing: boolean }) {
  const t = useT();
  const [data, setData] = useState<SchoolQuickStats | null>(null);
  const [pending, startTransition] = useTransition();
  const label = t("School analytics");

  const load = (open: boolean) => {
    if (!open) return;
    startTransition(async () => setData(await schoolQuickStatsAction()));
  };

  const staffName = (row: SchoolQuickStats["staff"][number]) => row.name ?? (row.key === "admin" ? t("Owner (website)") : t("Not identified"));

  return (
    <Dialog onOpenChange={load}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} />}>
        <GraduationCapIcon />
      </DialogTrigger>
      <DialogContent showCloseButton={false} style={telegramTheme} className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <DialogTitle>{t("School Telegram today")}</DialogTitle>
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t("Close")} />}>
            <XIcon />
          </DialogClose>
        </div>

        {pending || !data ? (
          <p className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            {t("Loading…")}
          </p>
        ) : !data.ok ? (
          <p className="p-6 text-center text-muted-foreground">{t("You don't have permission to do this.")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-2">
              {[
                { label: t("Telegram users"), value: data.totals.users },
                { label: t("New today"), value: data.totals.newUsers },
                { label: t("Waiting for a reply"), value: data.totals.waitingNow },
                { label: t("Registered"), value: data.totals.registered },
                { label: t("Paid"), value: data.totals.paidStudents },
                { label: t("Money in"), value: formatPrice(t, data.totals.etb) },
              ].map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col rounded-xl bg-muted/60 px-3 py-2">
                  <dt className="order-2 truncate text-[11px] text-muted-foreground">{stat.label}</dt>
                  <dd className="order-1 truncate text-lg font-semibold text-[var(--tg-link,var(--primary))]">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">{t("By staff today")}</h3>
              {data.staff.length === 0 ? (
                <p className="text-muted-foreground">{t("No staff added yet.")}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {data.staff.map((row) => (
                    <li key={row.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-muted/60 px-3 py-2">
                      <span className="font-semibold">{staffName(row)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("{count} replies", { count: row.replies })} · {t("{count} links", { count: row.links })} · {t("{count} registered", { count: row.registered })} ·{" "}
                        <span className="font-semibold text-foreground">{formatPrice(t, row.etb)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">{t("Students now")}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_SEGMENTS.map((segment) => (
                  <div key={segment} className="flex flex-col rounded-xl bg-muted/60 px-3 py-2">
                    <span className="text-lg font-semibold">{data.segments[segment] ?? 0}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{t(segmentLabels[segment])}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              {canMarketing ? (
                <LocaleLink href={SCHOOL_MARKETING} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <MegaphoneIcon />
                  {t("Marketing")}
                </LocaleLink>
              ) : null}
              <LocaleLink href={SCHOOL_ANALYTICS} className={buttonVariants({ size: "sm" })}>
                {t("Full analytics")}
              </LocaleLink>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
