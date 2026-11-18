import { ActionButton } from "@/components/action-form";
import { OrderProgress } from "@/components/order-progress";
import { Badge } from "@/components/ui/badge";
import { agentHandedOverAction, cancelOrderAction, releaseOrderAction } from "@/lib/actions";
import { formatDate, formatPrice, getPlatform, handoverOptions } from "@/lib/catalog";
import { feeFor } from "@/lib/fees";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getAdminOrders } from "@/lib/queries";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Orders");

export default async function AdminOrdersPage() {
  const t = await getT();
  const { can } = await requireStaff("/admin/orders", "orders", "ordersDecide");
  const orders = await getAdminOrders();

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Orders")}</h1>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No orders yet.")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold break-all" dir="ltr">
                  {getPlatform(order.listing.platform)?.name} · @{order.listing.username}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(t, order.amountEtb)} · {formatDate(order.createdAt)}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={order.handover === "AGENT" ? "default" : "secondary"}>
                    {t(handoverOptions.find((option) => option.value === order.handover)?.label ?? "Complete it ourselves")}
                  </Badge>
                  {t("Fee {percent}%: {fee} · Seller gets {payout}", {
                    percent: order.feePercent,
                    fee: formatPrice(t, feeFor(order.amountEtb, order.feePercent).feeEtb),
                    payout: formatPrice(t, feeFor(order.amountEtb, order.feePercent).payoutEtb),
                  })}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {t("Buyer:")} {order.buyer.name} ({order.buyer.email}){order.buyer.phone ? <span dir="ltr"> · {order.buyer.phone}</span> : null}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {t("Seller:")} {order.seller.name} ({order.seller.email}){order.seller.phone ? <span dir="ltr"> · {order.seller.phone}</span> : null}
                </p>
              </div>
              <OrderProgress status={order.status} />
              <div className="flex flex-wrap gap-2">
                {can.orders && order.status === "PAID" && order.handover === "AGENT" ? (
                  <ActionButton action={agentHandedOverAction} id={order.id}>
                    {t("Agent handed the account to the buyer")}
                  </ActionButton>
                ) : null}
                {can.ordersDecide && (order.status === "CONFIRMED" || order.status === "DISPUTED") ? (
                  <ActionButton action={releaseOrderAction} id={order.id}>
                    {t("Complete for seller")}
                  </ActionButton>
                ) : null}
                {can.ordersDecide && ["AWAITING_PAYMENT", "PAID", "TRANSFERRED", "DISPUTED"].includes(order.status) ? (
                  <ActionButton action={cancelOrderAction} id={order.id} variant="outline">
                    {t("Cancel order")}
                  </ActionButton>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
