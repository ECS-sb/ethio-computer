import { ActionButton } from "@/components/action-form";
import { HandoverNote } from "@/components/handover-note";
import { OrderProgress } from "@/components/order-progress";
import { markTransferredAction, openDisputeAction } from "@/lib/actions";
import { formatPrice, getPlatform } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getSellerOrders } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("My sales");

export default async function SellerOrdersPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/seller/orders");
  const orders = await getSellerOrders(user.id);

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("My sales")}</h1>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No sales yet.")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold break-all" dir="ltr">
                  @{order.handle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {getPlatform(order.platform)?.name} · {formatPrice(t, order.amountEtb)}
                </p>
              </div>
              <OrderProgress status={order.status} />
              <HandoverNote handover={order.handover} role="seller" status={order.status} amountEtb={order.amountEtb} feePercent={order.feePercent} />
              {order.status === "AWAITING_PAYMENT" ? <p className="text-sm text-muted-foreground">{t("Waiting for the buyer to pay from their wallet.")}</p> : null}
              {order.status === "RELEASED" && order.payoutEtb !== null ? (
                <p className="text-sm font-semibold text-primary">{t("{amount} was added to your wallet.", { amount: formatPrice(t, order.payoutEtb) })}</p>
              ) : null}
              {order.status === "PAID" || order.status === "TRANSFERRED" ? (
                <div className="flex flex-wrap gap-2">
                  {order.status === "PAID" && order.handover === "SELF" ? (
                    <ActionButton action={markTransferredAction} id={order.id}>
                      {t("I transferred the account")}
                    </ActionButton>
                  ) : null}
                  <ActionButton action={openDisputeAction} id={order.id} variant="outline">
                    {t("Open a dispute")}
                  </ActionButton>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
