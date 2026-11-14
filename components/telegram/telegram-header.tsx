import { PeriodPicker } from "@/components/telegram/period-picker";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import type { Inbox } from "@/lib/telegram/inbox";
import { cn } from "@/lib/utils";

function replyTime(t: T, minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return t("{minutes} min", { minutes });
  return t("{hours} h", { hours: Math.round(minutes / 6) / 10 });
}

/**
 * ከላይ ያሉት ቁጥሮች፦ በተመረጠው ጊዜ (1 ሰዓት … 6 ወር) የጻፉ ሰዎች፣ መልዕክቶች፣ ምላሾች፣ የምላሽ ጊዜ እና ማስጠንቀቂያዎች።
 * አሁን ምላሽ የሚጠብቁትና ማስጠንቀቂያ ያላቸው ቻቶች ቁጥር በፎልደሮቹ ላይ ይታያል። ርዕሱ ለስክሪን አንባቢ ብቻ ነው።
 */
export async function TelegramHeader({ inbox }: { inbox: Inbox }) {
  const t = await getT();
  const period = inbox.period;
  const stats = [
    { label: t("People who messaged"), value: period.people },
    { label: t("Messages received"), value: period.inbound },
    { label: t("Replies sent"), value: period.outbound },
    { label: t("Average reply time"), value: replyTime(t, period.averageMinutes) },
    { label: t("Replies slower than 1 hour"), value: period.slowReplies },
    { label: t("Alerts"), value: period.alerts, alert: period.alerts > 0 },
  ];

  return (
    <header className="flex flex-col gap-2 sm:flex-row">
      <h1 className="sr-only">{t("Telegram monitoring")}</h1>
      <PeriodPicker initialPeriod={period.id} />
      <dl className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="order-2 truncate text-xs text-muted-foreground" title={stat.label}>
              {stat.label}
            </dt>
            <dd className={cn("order-1 text-xl font-semibold", stat.alert ? "text-destructive" : "text-[var(--tg-link,var(--primary))]")}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
