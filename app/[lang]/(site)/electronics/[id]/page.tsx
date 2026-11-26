import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon, BadgeCheckIcon, MapPinIcon, MessageCircleIcon, ShieldCheckIcon } from "lucide-react";
import { AskSellerButton, BuyButton } from "@/components/electronics/deal-buttons";
import { LocaleLink } from "@/components/i18n-provider";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/catalog";
import { cityLabel, conditionLabels, ELECTRONICS_FEE_PERCENT, productCategory, productStatusLabels } from "@/lib/electronics-catalog";
import { getProductForViewer } from "@/lib/electronics-queries";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getWalletBalance } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const generateMetadata = pageTitle("Item details");

type Props = { params: Promise<{ id: string }> };

async function ProductContent({ params }: Props) {
  await connection();
  const t = await getT();
  const { id } = await params;
  const viewer = await getCurrentUser();
  const found = await getProductForViewer(id, viewer);
  if (!found) notFound();
  const { product, isOwner, threadId, sellerSales } = found;
  const category = productCategory(product.category);
  const balance = viewer && !isOwner ? await getWalletBalance(viewer.id) : 0;
  const loginHref = `/login?next=${encodeURIComponent(`/electronics/${product.id}`)}`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {product.official ? <Badge>{t("Official")}</Badge> : null}
            <Badge variant="outline">{t(category?.label ?? "Other")}</Badge>
            <Badge variant="secondary">{t(conditionLabels[product.condition])}</Badge>
            {product.status !== "APPROVED" ? <Badge variant="secondary">{t(productStatusLabels[product.status])}</Badge> : null}
          </div>
          <h1 className="text-3xl font-semibold text-balance">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              {product.sellerName}
              {product.verified ? <BadgeCheckIcon aria-label={t("Verified")} className="size-4 text-primary" /> : null}
            </span>
            <span>{t("{count} items sold", { count: sellerSales })}</span>
            <span className="flex items-center gap-1">
              <MapPinIcon className="size-4" />
              {t(cityLabel(product.city))}
            </span>
            {product.brand ? <span>{product.brand}</span> : null}
          </div>
          {product.status === "REJECTED" && product.rejectReason ? (
            <p className="rounded-xl bg-destructive/10 p-4 text-sm ring-1 ring-destructive/40">{t("Rejected: {reason}", { reason: product.rejectReason })}</p>
          ) : null}
        </header>

        {product.images.length > 0 ? <ScreenshotGallery images={product.images} src="/api/electronics-images/{id}" /> : null}

        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <h2 className="text-xl font-semibold">{t("About this item")}</h2>
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{product.description}</p>
          <p className="text-xs text-muted-foreground">{t("Posted {date}", { date: formatDate(product.createdAt) })}</p>
        </section>
      </div>

      <aside className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-primary/30 lg:sticky lg:top-24">
        <p className="font-heading text-3xl font-bold text-primary">{formatPrice(t, product.priceEtb)}</p>
        {isOwner ? (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("This is your item. Buyers see this page.")}</p>
            <p>
              {product.official
                ? t("This is an Ethio Computer item. The full amount goes to your wallet when the buyer confirms.")
                : t("Ethio Computer keeps {percent}% of each sale; you get the rest when the buyer confirms receiving it.", { percent: ELECTRONICS_FEE_PERCENT })}
            </p>
            <LocaleLink href="/dashboard/electronics" className={buttonVariants({ variant: "outline" })}>
              {t("My items")}
            </LocaleLink>
          </div>
        ) : !viewer ? (
          <div className="flex flex-col gap-2">
            <LocaleLink href={loginHref} className={buttonVariants({ size: "lg" })}>
              {t("Sign in to buy")}
            </LocaleLink>
            <LocaleLink href={loginHref} className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("Sign in to ask a question")}
            </LocaleLink>
          </div>
        ) : (
          <>
            {threadId ? (
              <LocaleLink href={`/dashboard/electronics/deals/${threadId}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
                <MessageCircleIcon data-icon="inline-start" />
                {t("Open the chat")}
              </LocaleLink>
            ) : product.status === "APPROVED" ? (
              <AskSellerButton productId={product.id} />
            ) : null}
            {product.status === "APPROVED" ? (
              <div className="flex flex-col gap-2 border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">
                  {t("Wallet balance: {amount}", { amount: formatPrice(t, balance) })}{" "}
                  {balance < product.priceEtb ? (
                    <LocaleLink href="/dashboard/wallet" className="text-primary hover:underline">
                      {t("Add money")}
                    </LocaleLink>
                  ) : null}
                </p>
                <BuyButton productId={product.id} label={t("Buy for {amount}", { amount: formatPrice(t, product.priceEtb) })} />
                <p className="text-xs text-muted-foreground">{t("Agree on the price in the chat first. If the seller lowers it, the new price shows here.")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("This item isn't available right now.")}</p>
            )}
          </>
        )}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          {t("Your money is held by Ethio Computer and reaches the seller only after you confirm you received the item. If the seller cancels, you get it all back.")}
        </p>
      </aside>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-6 pt-12">
      <LocaleLink href="/electronics" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("All electronics")}
      </LocaleLink>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <ProductContent params={params} />
      </Suspense>
    </div>
  );
}
