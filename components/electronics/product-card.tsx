import Image from "next/image";
import { BadgeCheckIcon, MapPinIcon } from "lucide-react";
import { PlatformMark } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/catalog";
import { cityLabel, conditionLabels, productCategory } from "@/lib/electronics-catalog";
import type { ProductCard as ProductCardData } from "@/lib/electronics-queries";
import { getT } from "@/lib/i18n-server";

export async function ProductCard({ product }: { product: ProductCardData }) {
  const t = await getT();
  const category = productCategory(product.category);
  return (
    <LocaleLink
      href={`/electronics/${product.id}`}
      className="group flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 transition-all hover:-translate-y-1 hover:ring-primary/60"
    >
      {product.cover ? (
        <Image
          unoptimized
          src={`/api/electronics-images/${product.cover.id}?size=thumb`}
          alt=""
          width={product.cover.width}
          height={product.cover.height}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-xl bg-secondary object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-secondary">
          <PlatformMark mark={category?.mark ?? ""} className="size-14" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {product.official ? <Badge>{t("Official")}</Badge> : null}
        <Badge variant="outline">{t(category?.label ?? "Other")}</Badge>
        <Badge variant="secondary">{t(conditionLabels[product.condition])}</Badge>
      </div>
      <h3 className="line-clamp-2 font-semibold text-balance">{product.title}</h3>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {product.sellerName}
        {product.verified ? <BadgeCheckIcon aria-label={t("Verified")} className="size-4 text-primary" /> : null}
      </p>
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon className="size-4" />
          {t(cityLabel(product.city))}
        </span>
        <span className="font-heading text-xl font-bold text-primary">{formatPrice(t, product.priceEtb)}</span>
      </div>
    </LocaleLink>
  );
}
