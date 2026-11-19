import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { gigCategory, isMessageKey, jobStatusLabels } from "@/lib/talent-catalog";
import { getMyThreads } from "@/lib/talent-queries";

export const generateMetadata = pageTitle("Jobs");

export default async function JobsPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/jobs");
  const threads = await getMyThreads(user.id);
  const sections: { title: MessageKey; items: typeof threads }[] = [
    { title: "Pros I hired", items: threads.filter((thread) => thread.asClient) },
    { title: "My clients", items: threads.filter((thread) => !thread.asClient) },
  ];

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Jobs")}</h1>
      {threads.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">{t("No jobs or chats yet.")}</p>
          <LocaleLink href="/talent" className={buttonVariants()}>
            {t("Find a pro")}
          </LocaleLink>
        </div>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <section key={section.title} className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">{t(section.title)}</h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((thread) => (
                  <li key={thread.id}>
                    <LocaleLink
                      href={`/dashboard/jobs/${thread.id}`}
                      className="flex flex-col gap-2 rounded-xl bg-card/70 p-4 ring-1 ring-foreground/10 transition-colors hover:ring-primary/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-medium">{thread.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {thread.otherName} · {t(gigCategory(thread.category)?.label ?? "Other")} · {formatDate(thread.updatedAt)}
                        </span>
                        {thread.lastMessage ? (
                          <span className="truncate text-sm text-muted-foreground">
                            {thread.lastMessage.system && isMessageKey(thread.lastMessage.body) ? t(thread.lastMessage.body) : thread.lastMessage.body}
                          </span>
                        ) : null}
                      </span>
                      {thread.job ? (
                        <span className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={thread.job.status === "DISPUTED" ? "destructive" : thread.job.status === "COMPLETED" ? "default" : "secondary"}>
                            {t(jobStatusLabels[thread.job.status])}
                          </Badge>
                          <span className="text-sm font-semibold text-primary">{formatPrice(t, thread.job.amountEtb)}</span>
                        </span>
                      ) : (
                        <Badge variant="outline">{t("Chat only")}</Badge>
                      )}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </>
  );
}
