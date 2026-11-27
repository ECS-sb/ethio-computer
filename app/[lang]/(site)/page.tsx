import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRightIcon } from "lucide-react";
import { Eyebrow } from "@/components/brand";
import { HomeBanners } from "@/components/home-banners";
import { LocaleLink } from "@/components/i18n-provider";
import { ListingCard } from "@/components/listing-card";
import { MarketBrowser } from "@/components/market-browser";
import { PlatformOrbit } from "@/components/platform-orbit";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { howItWorksSteps } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import { getFeaturedListings, getPlatformCounts } from "@/lib/queries";
import { cn } from "@/lib/utils";

type T = Awaited<ReturnType<typeof getT>>;

const reveal = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700";

function SectionHeading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-tight font-bold tracking-tighter sm:text-5xl">{children}</h2>
    </div>
  );
}

function Hero({ t }: { t: T }) {
  return (
    <section className="relative flex flex-col items-center gap-6 pt-6 text-center sm:pt-10">
      <h1 className="sr-only">
        {t("Buy or sell")} {t("social media accounts")}
      </h1>

      <div className={cn(reveal, "w-full px-1 sm:px-12")}>
        <PlatformOrbit title={t("Buy or sell")} highlight={t("social media accounts")} />
      </div>

      <p className={cn(reveal, "max-w-md text-sm text-muted-foreground delay-200 sm:text-base")}>
        {t("Verified sellers, payment held until handover, and a clear process. Tap a platform to see its accounts.")}
      </p>

      <div className={cn(reveal, "flex flex-wrap items-center justify-center gap-2 delay-300 sm:gap-4")}>
        {/* የሚንቀሳቀስ (wave) አዝራር፦ ከኋላው የሚሰፋ ወርቃማ ሞገድ */}
        <span className="relative inline-flex">
          <span aria-hidden className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-ping motion-safe:[animation-duration:2s]" />
          <span aria-hidden className="absolute -inset-1 rounded-full bg-primary/20 blur-md" />
          <LocaleLink href="/accounts" className={cn(buttonVariants(), "relative rounded-full bg-linear-to-r from-primary to-gold-2 px-4 shadow-lg shadow-primary/30 sm:px-6")}>
            {t("Browse the market")}
            <ArrowRightIcon data-icon="inline-end" />
          </LocaleLink>
        </span>
        <LocaleLink href="/sell" className={cn(buttonVariants({ variant: "outline" }), "rounded-full bg-card/50 px-4 backdrop-blur-sm sm:px-6")}>
          {t("Sell an account")}
        </LocaleLink>
      </div>
    </section>
  );
}

/** ገበያው በመነሻ ገጹ ላይ፦ አዳዲሶቹ አካውንቶች (የተረጋገጡ ሻጮች መጀመሪያ)፣ በፕላትፎርም አዝራሮች ይጣራሉ። */
async function Market() {
  await connection();
  const [listings, counts] = await Promise.all([getFeaturedListings(24), getPlatformCounts()]);
  return (
    <MarketBrowser
      counts={counts}
      items={listings.map((listing) => ({ id: listing.id, platform: listing.platform, card: <ListingCard listing={listing} /> }))}
    />
  );
}

function HowItWorks({ t }: { t: T }) {
  return (
    <section className="flex flex-col gap-12 pt-24 pb-12">
      <SectionHeading eyebrow={t("Orders, step by step")}>
        {t("How")} <span className="text-gold">{t("it works")}</span>
      </SectionHeading>
      <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div aria-hidden className="absolute top-6 right-[12.5%] left-[12.5%] hidden h-px bg-linear-to-r from-primary/0 via-primary/60 to-primary/0 lg:block" />
        {howItWorksSteps.map((step, index) => (
          <li key={step.title} className="relative flex flex-col items-start gap-4 lg:items-center lg:text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-gold-2 font-heading text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-8 ring-background">
              {index + 1}
            </span>
            <h3 className="text-lg font-semibold">{t(step.title)}</h3>
            <p className="text-sm text-muted-foreground">{t(step.description)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HomePage() {
  const t = await getT();
  return (
    <>
      <Suspense fallback={null}>
        <HomeBanners />
      </Suspense>
      <Hero t={t} />

      <section id="market" className="flex scroll-mt-28 flex-col gap-12 pt-24">
        <SectionHeading eyebrow={t("Browse the market")}>
          {t("Buy")} <span className="text-gold">{t("social media accounts")}</span>
        </SectionHeading>
        <Suspense
          fallback={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-10 rounded-full" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-80 rounded-xl" />
                ))}
              </div>
            </div>
          }
        >
          <Market />
        </Suspense>
      </section>

      <HowItWorks t={t} />
    </>
  );
}
