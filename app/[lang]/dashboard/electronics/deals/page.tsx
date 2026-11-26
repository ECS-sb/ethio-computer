import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/catalog";
import { productOrderLabels } from "@/lib/electronics-catalog";
import { getMyDeals } from "@/lib/electronics-queries";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { isMessageKey } from "@/lib/talent-catalog";

export const generateMetadata = pageTitle("Electronics chats");

export default async function DealsPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/electronics/deals");
  const deals = await getMyDeals(user.id);
  const sections: { title: MessageKey; items: typeof deals }[] = [
    { title: "Items I'm buying", items: deals.filter((deal) => deal.asBuyer) },
    { title: "Buyers of my items", items: deals.filter((deal) => !deal.asBuyer) },
  ];

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Electronics chats")}</h1>
      {deals.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">{t("No chats yet.")}</p>
          <LocaleLink href="/electronics" className={buttonVariants()}>
            {t("Browse items")}
          </LocaleLink>
        </div>
      ) : (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <section key={section.title} className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">{t(section.title)}</h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((deal) => (
                  <li key={deal.id}>
                    <LocaleLink
                      href={`/dashboard/electronics/deals/${deal.id}`}
                      className="flex flex-col gap-2 rounded-xl bg-card/70 p-4 ring-1 ring-foreground/10 transition-colors hover:ring-primary/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-medium">{deal.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {deal.otherName} · {formatDate(deal.updatedAt)}
                        </span>
                        {deal.lastMessage ? (
                          <span className="truncate text-sm text-muted-foreground">
                            {deal.lastMessage.system && isMessageKey(deal.lastMessage.body) ? t(deal.lastMessage.body) : deal.lastMessage.body}
                          </span>
                        ) : null}
                      </span>
                      {deal.order ? (
                        <span className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant={deal.order.status === "DISPUTED" ? "destructive" : deal.order.status === "COMPLETED" ? "default" : "secondary"}>
                            {t(productOrderLabels[deal.order.status])}
                          </Badge>
                          <span className="text-sm font-semibold text-primary">{formatPrice(t, deal.order.amountEtb)}</span>
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
