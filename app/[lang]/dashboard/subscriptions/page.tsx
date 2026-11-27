import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { isMessageKey } from "@/lib/talent-catalog";
import { requireUser } from "@/lib/session";
import { subscriptionStatusLabels } from "@/lib/subscription-catalog";
import { getMySubscriptionOrders } from "@/lib/subscription-queries";

export const generateMetadata = pageTitle("My subscriptions");

export default async function MySubscriptionsPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/subscriptions");
  const orders = await getMySubscriptionOrders(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("My subscriptions")}</h1>
        <LocaleLink href="/subscriptions" className={buttonVariants()}>
          {t("Buy a subscription")}
        </LocaleLink>
      </div>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("You haven't bought a subscription yet.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id}>
              <LocaleLink
                href={`/dashboard/subscriptions/${order.id}`}
                className="flex flex-col gap-2 rounded-xl bg-card/70 p-4 ring-1 ring-foreground/10 transition-colors hover:ring-primary/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-medium">
                    {order.serviceName} · {isMessageKey(order.planLabel) ? t(order.planLabel) : order.planLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={order.status === "DELIVERED" ? "default" : order.status === "PAID" ? "secondary" : "outline"}>{t(subscriptionStatusLabels[order.status])}</Badge>
                  <span className="text-sm font-semibold text-primary">{formatPrice(t, order.amountEtb)}</span>
                </span>
              </LocaleLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
