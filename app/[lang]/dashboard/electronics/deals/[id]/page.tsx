import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, SendIcon, ShieldAlertIcon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { BuyButton } from "@/components/electronics/deal-buttons";
import { ProductOrderProgress } from "@/components/electronics/order-progress";
import { LocaleLink } from "@/components/i18n-provider";
import { ChatLog } from "@/components/talent/chat-log";
import { Input } from "@/components/ui/input";
import { formatDate, formatPrice } from "@/lib/catalog";
import { MAX_CHAT_STRIKES } from "@/lib/chat-guard";
import {
  cancelProductOrderAction,
  confirmReceivedAction,
  markHandedOverAction,
  openProductDisputeAction,
  sendProductMessageAction,
} from "@/lib/electronics-actions";
import { cityLabel } from "@/lib/electronics-catalog";
import { getDeal, type DealOrder } from "@/lib/electronics-queries";
import { feeFor } from "@/lib/fees";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getChatStrikes } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Electronics chats");

async function OrderCard({ order, asBuyer }: { order: DealOrder; asBuyer: boolean }) {
  const t = await getT();
  const payout = feeFor(order.amountEtb, order.feePercent).payoutEtb;
  const canDispute = order.status === "PAID" || order.status === "HANDED_OVER";

  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-1">
        <p className="font-heading text-2xl font-bold text-primary">{formatPrice(t, order.amountEtb)}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
          {!asBuyer ? ` · ${t("You get {amount} after the fee", { amount: formatPrice(t, payout) })}` : ""}
        </p>
      </div>
      <ProductOrderProgress status={order.status} />

      {/* የገዢው ተግባራት */}
      {asBuyer && (order.status === "PAID" || order.status === "HANDED_OVER") ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {order.status === "PAID"
              ? t("The money is held safely. Agree with the seller in this chat on where and when to meet.")
              : t("Check the item well. Confirm only if it works and matches the description: the seller gets paid right away.")}
          </p>
          <ActionButton action={confirmReceivedAction} id={order.id} size="lg" className="w-fit">
            {t("I received the item")}
          </ActionButton>
          {order.status === "PAID" ? (
            <ActionButton action={cancelProductOrderAction} id={order.id} variant="outline" className="w-fit">
              {t("Cancel and get my money back")}
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {/* የሻጩ ተግባራት */}
      {!asBuyer && order.status === "PAID" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">{t("The buyer paid and the money is held. Agree on a meeting place here, hand over the item, then mark it.")}</p>
          <div className="flex flex-wrap gap-2">
            <ActionButton action={markHandedOverAction} id={order.id}>
              {t("I handed over the item")}
            </ActionButton>
            <ActionButton action={cancelProductOrderAction} id={order.id} variant="outline">
              {t("Cancel the sale")}
            </ActionButton>
          </div>
        </div>
      ) : null}
      {!asBuyer && order.status === "HANDED_OVER" ? <p className="text-sm text-muted-foreground">{t("Waiting for the buyer to confirm receiving the item.")}</p> : null}
      {!asBuyer && order.status === "COMPLETED" && order.payoutEtb !== null ? (
        <p className="text-sm text-primary">{t("{amount} was added to your wallet.", { amount: formatPrice(t, order.payoutEtb) })}</p>
      ) : null}

      {canDispute ? (
        <ActionButton action={openProductDisputeAction} id={order.id} variant="ghost" size="sm" className="w-fit text-muted-foreground">
          {t("Report a problem to Ethio Computer")}
        </ActionButton>
      ) : null}
      {order.status === "DISPUTED" ? (
        <p className="text-sm text-muted-foreground">{t("An admin is reading this chat and will decide. Keep all messages here.")}</p>
      ) : null}
    </article>
  );
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const user = await requireUser(`/dashboard/electronics/deals/${id}`);
  const [deal, strikes] = await Promise.all([getDeal(id, user.id), getChatStrikes(user.id)]);
  if (!deal) notFound();
  const activeOrder = deal.orders.some((order) => ["PAID", "HANDED_OVER", "DISPUTED"].includes(order.status));
  const cover = deal.product.images[0];

  return (
    <>
      <AutoRefresh />
      <LocaleLink href="/dashboard/electronics/deals" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("Electronics chats")}
      </LocaleLink>
      <header className="flex items-center gap-4">
        {cover ? (
          <Image unoptimized src={`/api/electronics-images/${cover.id}?size=thumb`} alt="" width={96} height={72} className="aspect-[4/3] w-24 rounded-xl bg-secondary object-cover" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold text-balance">{deal.product.title}</h1>
          <p className="text-sm text-muted-foreground">
            {deal.asBuyer ? t("Seller: {name}", { name: deal.otherName }) : t("Buyer: {name}", { name: deal.otherName })} · {t(cityLabel(deal.product.city))} ·{" "}
            <LocaleLink href={`/electronics/${deal.product.id}`} className="hover:underline">
              {t("View the item")}
            </LocaleLink>
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-label={t("Chat")} className="flex min-w-0 flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div
            role="note"
            className={cn("flex items-start gap-2 rounded-xl p-4 text-xs ring-1", strikes > 0 ? "bg-destructive/10 ring-destructive/40" : "bg-primary/10 ring-primary/30")}
          >
            <ShieldAlertIcon className={cn("size-4 shrink-0", strikes > 0 ? "text-destructive" : "text-primary")} />
            <p>
              {t("Agree on the meeting place and time here. Phone numbers, usernames, links and other apps are blocked, and the third attempt suspends your account. Never pay outside the site.")}{" "}
              {strikes > 0 ? <strong>{t("Your warnings: {count} of {max}.", { count: strikes, max: MAX_CHAT_STRIKES })}</strong> : null}
            </p>
          </div>
          <div className="flex min-h-72 flex-col gap-2">
            <ChatLog messages={deal.messages} selfId={user.id} />
          </div>
          <ActionForm action={sendProductMessageAction} className="flex gap-2">
            <input type="hidden" name="threadId" value={deal.id} />
            <Input name="body" aria-label={t("Message")} placeholder={t("Write a message…")} required maxLength={2000} autoComplete="off" />
            <SubmitButton size="icon" aria-label={t("Send")} className="size-11">
              <SendIcon />
            </SubmitButton>
          </ActionForm>
        </section>

        <div className="flex flex-col gap-6">
          {deal.orders.map((order) => (
            <OrderCard key={order.id} order={order} asBuyer={deal.asBuyer} />
          ))}
          {deal.asBuyer && !activeOrder && deal.product.status === "APPROVED" ? (
            <div className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-primary/30">
              <p className="text-sm text-muted-foreground">{t("Ready to buy? Your money is held safely until you confirm receiving the item.")}</p>
              <BuyButton productId={deal.product.id} label={t("Buy for {amount}", { amount: formatPrice(t, deal.product.priceEtb) })} />
            </div>
          ) : null}
          {!deal.asBuyer && deal.orders.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
              {t("The buyer hasn't paid yet. Answer their questions here; if you agree on a lower price, change it on My items.")}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
