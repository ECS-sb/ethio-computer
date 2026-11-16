import { WalletIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { HandoverNote } from "@/components/handover-note";
import { OrderProgress } from "@/components/order-progress";
import { buttonVariants } from "@/components/ui/button";
import { confirmReceivedAction, openDisputeAction, payOrderAction } from "@/lib/actions";
import { formatPrice, getPlatform } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getBuyerOrders, getWalletBalance } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("My purchases");

export default async function BuyerOrdersPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/buyer/orders");
  const [orders, balance] = await Promise.all([getBuyerOrders(user.id), getWalletBalance(user.id)]);

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("My purchases")}</h1>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No purchases yet.")}</p>
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
              <HandoverNote handover={order.handover} role="buyer" status={order.status} />
              {order.status === "AWAITING_PAYMENT" ? (
                <div className="flex flex-col gap-4 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/30">
                  <p className="flex items-center gap-2 text-sm">
                    <WalletIcon className="size-4 text-primary" />
                    {t("Wallet balance: {amount}", { amount: formatPrice(t, balance) })}
                  </p>
                  {balance >= order.amountEtb ? (
                    <ActionButton action={payOrderAction} id={order.id} className="w-fit">
                      {t("Pay {amount} from wallet", { amount: formatPrice(t, order.amountEtb) })}
                    </ActionButton>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4">
                      <p className="text-sm">{t("Add {amount} to your wallet to pay.", { amount: formatPrice(t, order.amountEtb - balance) })}</p>
                      <LocaleLink href="/dashboard/wallet" className={buttonVariants({ size: "sm" })}>
                        {t("Add money")}
                      </LocaleLink>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t("The money is held by Ethio Computer and reaches the seller only after you confirm the handover.")}</p>
                </div>
              ) : null}
              {order.status === "PAID" || order.status === "TRANSFERRED" ? (
                <div className="flex flex-wrap gap-2">
                  {order.status === "TRANSFERRED" ? (
                    <ActionButton action={confirmReceivedAction} id={order.id}>
                      {t("I received the account")}
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
