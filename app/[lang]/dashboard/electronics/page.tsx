import Image from "next/image";
import { MessageCircleIcon, PlusIcon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/catalog";
import { setProductPausedAction, setProductPriceAction } from "@/lib/electronics-actions";
import { productCategory, productStatusLabels } from "@/lib/electronics-catalog";
import { getMyProducts } from "@/lib/electronics-queries";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("My items");

export default async function MyProductsPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/electronics");
  const products = await getMyProducts(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("My items")}</h1>
        <div className="flex flex-wrap gap-2">
          <LocaleLink href="/dashboard/electronics/deals" className={buttonVariants({ variant: "outline" })}>
            <MessageCircleIcon data-icon="inline-start" />
            {t("Electronics chats")}
          </LocaleLink>
          <LocaleLink href="/dashboard/electronics/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            {t("Sell an item")}
          </LocaleLink>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">{t("Have a camera, mic, light or other content creation gear to sell? Post it with a few photos.")}</p>
          <LocaleLink href="/dashboard/electronics/new" className={buttonVariants()}>
            {t("Sell an item")}
          </LocaleLink>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {products.map((product) => (
            <article key={product.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 sm:flex-row">
              {product.cover ? (
                <Image
                  unoptimized
                  src={`/api/electronics-images/${product.cover.id}?size=thumb`}
                  alt=""
                  width={product.cover.width}
                  height={product.cover.height}
                  className="aspect-[4/3] w-full rounded-xl bg-secondary object-cover sm:w-40"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={product.status === "APPROVED" ? "default" : product.status === "REJECTED" ? "destructive" : "secondary"}>
                    {t(productStatusLabels[product.status])}
                  </Badge>
                  {product.official ? <Badge variant="outline">{t("Official")}</Badge> : null}
                  <Badge variant="outline">{t(productCategory(product.category)?.label ?? "Other")}</Badge>
                </div>
                <h2 className="font-semibold">{product.title}</h2>
                <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">{formatPrice(t, product.priceEtb)}</span>
                  <span>{t("{count} chats", { count: product.chats })}</span>
                </p>
                {product.status === "REJECTED" && product.rejectReason ? <p className="text-sm text-destructive">{t("Rejected: {reason}", { reason: product.rejectReason })}</p> : null}
                {product.status === "PENDING" ? <p className="text-sm text-muted-foreground">{t("An admin is reviewing your item. It usually takes less than a day.")}</p> : null}
                <div className="flex flex-wrap items-center gap-2">
                  <LocaleLink href={`/electronics/${product.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t("View")}
                  </LocaleLink>
                  {product.status === "APPROVED" ? (
                    <ActionButton action={setProductPausedAction} id={product.id} fields={{ paused: "true" }} variant="outline" size="sm">
                      {t("Pause")}
                    </ActionButton>
                  ) : null}
                  {product.status === "PAUSED" ? (
                    <ActionButton action={setProductPausedAction} id={product.id} fields={{ paused: "false" }} size="sm">
                      {t("Go live again")}
                    </ActionButton>
                  ) : null}
                  {["PENDING", "APPROVED", "PAUSED"].includes(product.status) ? (
                    <ActionForm action={setProductPriceAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={product.id} />
                      <Input
                        name="priceEtb"
                        type="number"
                        inputMode="numeric"
                        min={50}
                        defaultValue={product.priceEtb}
                        aria-label={t("Price (ETB)")}
                        className="h-8 w-32"
                      />
                      <SubmitButton variant="outline" size="sm">
                        {t("Change price")}
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
