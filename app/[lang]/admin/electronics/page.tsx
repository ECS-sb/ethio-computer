import Image from "next/image";
import { PlusIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { ReviewForm } from "@/components/review-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/catalog";
import { resolveProductOrderAction, reviewProductAction } from "@/lib/electronics-actions";
import { cityLabel, conditionLabels, productCategory, productOrderLabels } from "@/lib/electronics-catalog";
import { getAdminProductOrders, getPendingProducts } from "@/lib/electronics-queries";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/session";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Electronics");

export default async function AdminElectronicsPage() {
  const t = await getT();
  const { can } = await requireStaff("/admin/electronics", "listings", "ordersDecide");
  const [products, orders, user] = await Promise.all([
    can.listings ? getPendingProducts() : [],
    can.ordersDecide ? getAdminProductOrders() : [],
    getCurrentUser(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("Electronics")}</h1>
        {user?.isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <LocaleLink href="/dashboard/electronics" className={buttonVariants({ variant: "outline" })}>
              {t("Our items")}
            </LocaleLink>
            <LocaleLink href="/dashboard/electronics/new" className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              {t("Post an Ethio Computer item")}
            </LocaleLink>
          </div>
        ) : null}
      </div>

      {can.listings ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Items to review")}</h2>
          {products.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("Nothing to review.")}</p>
          ) : (
            products.map((product) => (
              <article key={product.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t(productCategory(product.category)?.label ?? "Other")}</Badge>
                  <Badge variant="secondary">{t(conditionLabels[product.condition])}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(t, product.priceEtb)} · {t(cityLabel(product.city))} · {formatDate(product.createdAt)}
                  </span>
                </div>
                <h3 className="font-semibold">
                  {product.title}
                  {product.brand ? <span className="text-muted-foreground"> · {product.brand}</span> : null}
                </h3>
                <p className="text-sm break-all text-muted-foreground">
                  {product.seller.name} ({product.seller.email})
                </p>
                <p className="text-sm break-words whitespace-pre-line">{product.description}</p>
                <div className="flex flex-wrap gap-4">
                  {product.images.map((image) => (
                    <a key={image.id} href={`/api/electronics-images/${image.id}`} target="_blank" rel="noopener noreferrer">
                      <Image
                        unoptimized
                        src={`/api/electronics-images/${image.id}?size=thumb`}
                        alt={t("Photos")}
                        width={image.width}
                        height={image.height}
                        className="h-28 w-auto rounded-xl bg-secondary object-cover ring-1 ring-foreground/10"
                      />
                    </a>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t("Check that it is gear for content creation, the photos show a real item with no phone numbers or other contacts, and the price is realistic.")}</p>
                <ReviewForm action={reviewProductAction} id={product.id} approveLabel={t("Approve")} />
              </article>
            ))
          )}
        </section>
      ) : null}

      {can.ordersDecide ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Open electronics orders")}</h2>
          {orders.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No open orders.")}</p>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={order.status === "DISPUTED" ? "destructive" : "secondary"}>{t(productOrderLabels[order.status])}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(t, order.amountEtb)} · {formatDate(order.createdAt)}
                  </span>
                </div>
                <h3 className="font-semibold">{order.product.title}</h3>
                <p className="text-sm break-all text-muted-foreground">
                  {t("Buyer: {name}", { name: `${order.buyer.name} (${order.buyer.email})` })}
                </p>
                <p className="text-sm break-all text-muted-foreground">
                  {t("Seller: {name}", { name: `${order.seller.name} (${order.seller.email})` })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <LocaleLink href={`/admin/electronics/${order.threadId}`} className={buttonVariants({ variant: "outline" })}>
                    {t("Read the chat")}
                  </LocaleLink>
                  <ActionButton action={resolveProductOrderAction} id={order.id} fields={{ decision: "release" }}>
                    {t("Pay the seller")}
                  </ActionButton>
                  <ActionButton action={resolveProductOrderAction} id={order.id} fields={{ decision: "refund" }} variant="outline">
                    {t("Refund the buyer")}
                  </ActionButton>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </>
  );
}
