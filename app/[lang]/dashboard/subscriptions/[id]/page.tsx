import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocaleLink } from "@/components/i18n-provider";
import { ChapaButtons } from "@/components/subscriptions/chapa-buttons";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { isMessageKey } from "@/lib/talent-catalog";
import { requireUser } from "@/lib/session";
import { cancelSubscriptionOrderAction } from "@/lib/subscription-actions";
import { subscriptionStatusLabels } from "@/lib/subscription-catalog";
import { getMySubscriptionOrder } from "@/lib/subscription-queries";
import { confirmChapaForOrder } from "@/lib/subscriptions";

export const generateMetadata = pageTitle("My subscriptions");

/** ደንበኛው ከቻፓ ሲመለስ (?check=1) ክፍያው ወዲያው ይረጋገጣል። */
export default async function SubscriptionOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ check?: string }> }) {
  const t = await getT();
  const { id } = await params;
  const user = await requireUser(`/dashboard/subscriptions/${id}`);
  const first = await getMySubscriptionOrder(id, user.id);
  if (!first) notFound();
  if (first.status === "AWAITING_PAYMENT" && first.payMethod === "CHAPA" && (await searchParams).check) {
    await confirmChapaForOrder(id).catch((error) => console.error("chapa check", error));
  }
  const order = (await getMySubscriptionOrder(id, user.id)) ?? first;

  return (
    <>
      {order.status === "PAID" || order.status === "AWAITING_PAYMENT" ? <AutoRefresh /> : null}
      <LocaleLink href="/dashboard/subscriptions" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("My subscriptions")}
      </LocaleLink>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          {order.serviceName} · {isMessageKey(order.planLabel) ? t(order.planLabel) : order.planLabel}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={order.status === "DELIVERED" ? "default" : order.status === "PAID" ? "secondary" : "outline"}>{t(subscriptionStatusLabels[order.status])}</Badge>
          <span className="font-semibold text-primary">{formatPrice(t, order.amountEtb)}</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        {order.status === "AWAITING_PAYMENT" ? (
          <>
            <p className="text-sm">{t("We haven't received the payment yet. Finish paying on Chapa, or check again if you already paid.")}</p>
            <ChapaButtons orderId={order.id} />
            <ActionButton action={cancelSubscriptionOrderAction} id={order.id} variant="ghost" size="sm" className="w-fit text-muted-foreground">
              {t("Cancel this order")}
            </ActionButton>
          </>
        ) : null}
        {order.status === "PAID" ? (
          <p className="flex items-start gap-2 text-sm">
            <ClockIcon className="size-5 shrink-0 text-primary" />
            {t("Payment received. We're buying and activating your subscription, usually within a few hours. This page updates by itself.")}
          </p>
        ) : null}
        {order.status === "DELIVERED" ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2Icon className="size-5" />
              {t("Your subscription is active.")}
            </p>
            {order.deliveredAt ? <p className="text-xs text-muted-foreground">{formatDateTime(order.deliveredAt)}</p> : null}
          </div>
        ) : null}
        {order.status === "REFUNDED" ? <p className="text-sm">{t("We couldn't activate it, so the money was returned to your wallet.")}</p> : null}
        {order.status === "CANCELLED" ? <p className="text-sm text-muted-foreground">{t("This order was cancelled.")}</p> : null}
        {order.deliveryNote ? (
          <div className="flex flex-col gap-1 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/30">
            <p className="text-xs font-semibold text-primary">{t("Message from Ethio Computer")}</p>
            <p className="text-sm break-words whitespace-pre-line">{order.deliveryNote}</p>
          </div>
        ) : null}
      </section>

      <dl className="grid gap-4 rounded-xl bg-card/70 p-6 text-sm ring-1 ring-foreground/10 sm:grid-cols-2">
        {order.accountInfo ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t("Account")}</dt>
            <dd dir="ltr" className="font-medium break-all">
              {order.accountInfo}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">{t("Paid with")}</dt>
          <dd className="font-medium">{order.payMethod === "CHAPA" ? "Chapa" : t("Wallet")}</dd>
        </div>
        {order.note ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("Your note")}</dt>
            <dd className="break-words whitespace-pre-line">{order.note}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}
