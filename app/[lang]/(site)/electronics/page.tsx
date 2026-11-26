import { Suspense } from "react";
import { connection } from "next/server";
import { SearchIcon, ShieldCheckIcon } from "lucide-react";
import { PageIntro } from "@/components/brand";
import { ProductCard } from "@/components/electronics/product-card";
import { LocaleLink } from "@/components/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { electronicsSteps, productCategories } from "@/lib/electronics-catalog";
import { getPublicProducts } from "@/lib/electronics-queries";
import type { ProductCategory } from "@/lib/generated/prisma/enums";
import { getT, pageTitle } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Electronics");

type Params = Promise<Record<string, string | string[] | undefined>>;

async function readFilter(searchParams: Params): Promise<{ category?: ProductCategory; q?: string }> {
  const params = await searchParams;
  const category = productCategories.find((option) => option.value === params.category)?.value;
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : undefined;
  return { category, q };
}

async function CategoryChips({ searchParams }: { searchParams: Params }) {
  await connection();
  const t = await getT();
  const { category: active, q } = await readFilter(searchParams);
  const query = q ? `&q=${encodeURIComponent(q)}` : "";
  const chip = (href: string, label: string, on: boolean) => (
    <LocaleLink
      key={href}
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors",
        on ? "bg-primary text-primary-foreground ring-primary" : "bg-card/70 ring-foreground/10 hover:ring-primary/60"
      )}
    >
      {label}
    </LocaleLink>
  );
  return (
    <div className="flex flex-col gap-4">
      <form action="" className="relative max-w-xl">
        <SearchIcon className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {active ? <input type="hidden" name="category" value={active} /> : null}
        <Input name="q" defaultValue={q} placeholder={t("Search phones, laptops, brands…")} aria-label={t("Search")} className="h-11 rounded-full ps-11" />
      </form>
      <nav aria-label={t("Categories")} className="flex flex-wrap gap-2">
        {chip(`/electronics${q ? `?q=${encodeURIComponent(q)}` : ""}`, t("All"), !active)}
        {productCategories.map((category) => chip(`/electronics?category=${category.value}${query}`, t(category.label), active === category.value))}
      </nav>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Params }) {
  await connection();
  const t = await getT();
  const products = await getPublicProducts(await readFilter(searchParams));
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
        <p className="text-muted-foreground">{t("No items here yet. Have something to sell?")}</p>
        <LocaleLink href="/dashboard/electronics/new" className={buttonVariants()}>
          {t("Sell an item")}
        </LocaleLink>
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default async function ElectronicsPage({ searchParams }: { searchParams: Params }) {
  const t = await getT();
  return (
    <>
      <PageIntro
        eyebrow={t("Phones, laptops, tablets and more")}
        title={
          <>
            {t("Buy and sell")} <span className="text-gold">{t("electronics.")}</span>
          </>
        }
        description={t("Pay safely on Ethio Computer. The seller gets the money only after you receive the item and confirm it.")}
      />
      <div className="flex flex-wrap gap-2">
        <a href="#items" className={buttonVariants({ size: "lg" })}>
          {t("Browse items")}
        </a>
        <LocaleLink href="/dashboard/electronics/new" className={buttonVariants({ size: "lg", variant: "outline" })}>
          {t("Sell an item")}
        </LocaleLink>
      </div>

      <ol className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {electronicsSteps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
            <h2 className="font-semibold">{t(step.title)}</h2>
            <p className="text-sm text-muted-foreground">{t(step.description)}</p>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm ring-1 ring-primary/30">
        <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
        {t("Meet in a safe public place, test the item before confirming, and never pay the seller outside the site.")}
      </p>

      <section id="items" className="flex scroll-mt-24 flex-col gap-6 pt-6">
        <Suspense fallback={<Skeleton className="h-24 w-full max-w-xl rounded-xl" />}>
          <CategoryChips searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-80 rounded-xl" />
              ))}
            </div>
          }
        >
          <Results searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}
