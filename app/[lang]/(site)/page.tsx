import { Suspense } from "react";
import { connection } from "next/server";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  LayoutGridIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { Eyebrow, PlatformMark } from "@/components/brand";
import { GrowthChart } from "@/components/growth-chart";
import { PlatformOrbit } from "@/components/platform-orbit";
import { LocaleLink } from "@/components/i18n-provider";
import { ListingCard } from "@/components/listing-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  categories,
  followerRanges,
  formatCount,
  howItWorksSteps,
  illustrationGrowth,
  platforms,
  priceRanges,
} from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { getFeaturedListings, getPlatformCounts, getTopSellers } from "@/lib/queries";
import { cn } from "@/lib/utils";

type T = Awaited<ReturnType<typeof getT>>;

// የካርዶቹ የጋራ መልክ፦ ከላይ ትንሽ የሚያበራ ጠርዝ ያለው ጨለማ መስታወት።
const surface =
  "relative overflow-hidden rounded-xl bg-linear-to-b from-card to-card/40 ring-1 ring-foreground/10 backdrop-blur-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-foreground/20 before:to-transparent";

const reveal = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:duration-700";

function SectionHeading({ eyebrow, children, action }: { eyebrow: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-4xl leading-tight font-bold tracking-tighter sm:text-5xl">{children}</h2>
      </div>
      {action}
    </div>
  );
}

async function PlatformTiles() {
  await connection();
  const t = await getT();
  const counts = await getPlatformCounts();
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {platforms.map((platform) => (
        <LocaleLink
          key={platform.id}
          href={`/accounts?platform=${platform.id}`}
          className={cn(
            surface,
            "group flex flex-col gap-6 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/15 hover:ring-primary/50"
          )}
        >
          <div className="flex items-start justify-between">
            <PlatformMark mark={platform.mark} className="transition-colors group-hover:bg-primary group-hover:text-primary-foreground" />
            <ArrowUpRightIcon className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
          <div>
            <p className="font-heading font-semibold">{platform.name}</p>
            <p className="text-sm text-muted-foreground">{t("{count} accounts", { count: counts[platform.id] ?? 0 })}</p>
          </div>
        </LocaleLink>
      ))}
    </div>
  );
}

async function Featured() {
  await connection();
  const t = await getT();
  const featured = await getFeaturedListings();
  if (featured.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-foreground/15 bg-card/40 p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <SparklesIcon className="size-6" />
        </span>
        <p className="font-heading text-lg font-semibold">{t("No listings yet")}</p>
        <p className="text-sm text-muted-foreground">{t("Be the first seller.")}</p>
        <LocaleLink href="/sell" className={buttonVariants()}>
          {t("Sell an account")}
          <ArrowRightIcon data-icon="inline-end" />
        </LocaleLink>
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

async function TopSellers() {
  await connection();
  const t = await getT();
  const sellers = await getTopSellers(3);
  if (sellers.length === 0) return null;
  return (
    <section className="flex flex-col gap-12 pt-32">
      <SectionHeading
        eyebrow={t("Trusted sellers")}
        action={
          <LocaleLink href="/sellers" className={buttonVariants({ variant: "outline" })}>
            {t("All sellers")}
            <ArrowRightIcon data-icon="inline-end" />
          </LocaleLink>
        }
      >
        {t("Top sellers")}
      </SectionHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        {sellers.map((seller, index) => (
          <LocaleLink
            key={seller.id}
            href={`/accounts?seller=${seller.id}`}
            className={cn(surface, "group flex items-center gap-4 p-6 transition-all hover:ring-primary/50")}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-gold-2 font-heading text-lg font-bold text-primary-foreground">
              {seller.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{seller.name}</p>
              <p className="text-sm text-muted-foreground">{t("{count} sales", { count: seller.deals })}</p>
            </div>
            <span className="font-heading text-3xl font-bold text-foreground/10 transition-colors group-hover:text-primary/40">#{index + 1}</span>
          </LocaleLink>
        ))}
      </div>
    </section>
  );
}

function Hero({ t }: { t: T }) {
  return (
    <section className="relative flex flex-col items-center gap-8 pt-12 text-center lg:pt-16">
      <p className={cn(reveal, "flex w-fit items-center gap-2 rounded-full bg-card/70 px-4 py-2 text-xs font-medium ring-1 ring-primary/30 backdrop-blur-sm")}>
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        {t("The account marketplace for Ethiopia")}
      </p>

      <h1 className={cn(reveal, "max-w-4xl text-4xl leading-[1.1] font-extrabold tracking-tighter delay-100 sm:text-6xl lg:text-7xl")}>
        {t("Buy or sell")} <span className="text-gold">{t("social media accounts")}</span>
      </h1>

      <p className={cn(reveal, "max-w-xl text-base text-muted-foreground delay-200 sm:text-lg")}>
        {t("Verified sellers, payment held until handover, and a clear process. Tap a platform to see its accounts.")}
      </p>

      <div className={cn(reveal, "flex flex-wrap items-center justify-center gap-4 delay-300")}>
        {/* የሚንቀሳቀስ (wave) አዝራር፦ ከኋላው የሚሰፋ ወርቃማ ሞገድ */}
        <span className="relative inline-flex">
          <span aria-hidden className="absolute inset-0 rounded-full bg-primary/40 motion-safe:animate-ping motion-safe:[animation-duration:2s]" />
          <span aria-hidden className="absolute -inset-1 rounded-full bg-primary/20 blur-md" />
          <LocaleLink href="/accounts" className={cn(buttonVariants({ size: "lg" }), "relative rounded-full bg-linear-to-r from-primary to-gold-2 px-8 shadow-lg shadow-primary/30")}>
            {t("Browse the market")}
            <ArrowRightIcon data-icon="inline-end" />
          </LocaleLink>
        </span>
        <LocaleLink href="/sell" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full bg-card/50 px-8 backdrop-blur-sm")}>
          {t("Sell an account")}
        </LocaleLink>
      </div>

      <div className={cn(reveal, "w-full px-2 pt-6 delay-500 sm:px-12 sm:pt-12")}>
        <PlatformOrbit />
      </div>
    </section>
  );
}

function Bento({ t }: { t: T }) {
  return (
    <section className="flex flex-col gap-12 pt-32">
      <SectionHeading eyebrow={t("Why Ethio Market")}>
        <span className="text-gold">{t("Buying and selling")}</span> {t("with a clear process.")}
      </SectionHeading>

      <div className="grid gap-4 lg:grid-cols-6">
        {/* ባለቤትነት ይረጋገጣል */}
        <div className={cn(surface, "flex flex-col gap-6 p-6 sm:p-8 lg:col-span-4")}>
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <BadgeCheckIcon className="size-6" />
          </span>
          <div className="flex max-w-md flex-col gap-2">
            <h3 className="text-2xl font-semibold">{t("Ownership is verified")}</h3>
            <p className="text-muted-foreground">{t("Every listing passes a verification code and an admin review.")}</p>
          </div>
          <div aria-hidden className="mt-auto flex flex-wrap items-center gap-4 rounded-xl bg-background/60 p-4 ring-1 ring-foreground/10">
            <PlatformMark mark="IG" className="rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <span className="h-2 w-32 rounded-full bg-foreground/15" />
              <span className="h-2 w-48 rounded-full bg-foreground/10" />
            </div>
            <span className="rounded-full bg-primary/15 px-4 py-2 font-mono text-sm font-semibold text-primary ring-1 ring-primary/40">EM-4821</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckIcon className="size-4" />
            </span>
          </div>
        </div>

        {/* ደረጃ በደረጃ ትዕዛዝ */}
        <div className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-linear-to-br from-primary to-gold-2 p-6 text-primary-foreground shadow-2xl shadow-primary/20 sm:p-8 lg:col-span-2">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/20 blur-2xl" />
          <h3 className="text-2xl font-semibold">{t("Orders, step by step")}</h3>
          <p className="text-sm">{t("From offer to handover, each step is visible to both buyer and seller.")}</p>
          <ol className="flex flex-col gap-2">
            {howItWorksSteps.map((step) => (
              <li key={step.title} className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
                  <CheckIcon className="size-3" />
                </span>
                {t(step.title)}
              </li>
            ))}
          </ol>
          <LocaleLink href="/how-it-works" className="mt-auto flex items-center gap-2 text-sm font-semibold hover:underline">
            {t("Learn more")}
            <ArrowRightIcon className="size-4" />
          </LocaleLink>
        </div>

        {/* የዕድገት ገበታ */}
        <div className={cn(surface, "flex flex-col gap-4 p-6 sm:p-8 lg:col-span-3")}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("Follower growth")}</p>
              <p className="font-heading text-4xl font-bold tracking-tight">{formatCount(illustrationGrowth[illustrationGrowth.length - 1])}</p>
            </div>
            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
              +{Math.round(((illustrationGrowth[illustrationGrowth.length - 1] - illustrationGrowth[0]) / illustrationGrowth[0]) * 100)}%
            </span>
          </div>
          <GrowthChart values={illustrationGrowth} />
          <p className="text-xs text-muted-foreground">{t("This image is an example and doesn't represent a real account.")}</p>
        </div>

        {/* ቁጥሮቹን ይመልከቱ */}
        <div className={cn(surface, "flex flex-col gap-6 p-6 sm:p-8 lg:col-span-3")}>
          <h3 className="text-3xl leading-tight font-bold tracking-tight">
            {t("Before you buy,")} <span className="text-gold">{t("see the numbers.")}</span>
          </h3>
          <p className="text-muted-foreground">
            {t("Each listing shows followers, engagement, audience and the seller's history. You can also compare accounts side by side.")}
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            <LocaleLink href="/compare" className={buttonVariants({ size: "lg" })}>
              {t("Compare accounts")}
              <ArrowRightIcon data-icon="inline-end" />
            </LocaleLink>
            <LocaleLink href="/faq" className={buttonVariants({ size: "lg", variant: "ghost" })}>
              {t("Have a question?")}
            </LocaleLink>
          </div>
        </div>
      </div>
    </section>
  );
}

const quickFilters: { title: MessageKey; icon: typeof LayoutGridIcon; param: string; options: { value: string; label: MessageKey }[] }[] = [
  { title: "By category", icon: LayoutGridIcon, param: "category", options: categories },
  { title: "By followers", icon: UsersIcon, param: "followers", options: followerRanges },
  { title: "By price", icon: WalletIcon, param: "price", options: priceRanges },
];

function QuickFilters({ t }: { t: T }) {
  return (
    <section className="flex flex-col gap-12 pt-32">
      <SectionHeading eyebrow={t("Search accounts")}>
        {t("Find it")} <span className="text-gold">{t("fast")}</span>
      </SectionHeading>
      <div className="grid gap-4 lg:grid-cols-3">
        {quickFilters.map((filter) => (
          <div key={filter.param} className={cn(surface, "flex flex-col gap-6 p-6")}>
            <div className="flex items-center gap-2">
              <filter.icon className="size-5 text-primary" />
              <h3 className="font-semibold">{t(filter.title)}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((option) => (
                <LocaleLink
                  key={option.value}
                  href={`/accounts?${filter.param}=${option.value}`}
                  className="rounded-full bg-secondary/70 px-4 py-2 text-sm ring-1 ring-foreground/10 transition-all hover:bg-primary hover:text-primary-foreground hover:ring-primary"
                >
                  {t(option.label)}
                </LocaleLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: T }) {
  return (
    <section className="flex flex-col gap-12 pt-32">
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

function SellCta({ t }: { t: T }) {
  return (
    <section className="pt-32 pb-12">
      <div className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-xl bg-linear-to-br from-primary to-gold-2 p-8 text-primary-foreground sm:p-16 lg:flex-row lg:items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--primary-foreground)_18%,transparent)_1px,transparent_1px)] bg-size-[20px_20px] mask-[linear-gradient(to_left,black,transparent)]"
        />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-white/25 blur-3xl" />
        <div className="relative flex max-w-xl flex-col gap-4">
          <h2 className="text-4xl leading-tight font-bold tracking-tighter sm:text-5xl">{t("Have an account to sell?")}</h2>
          <p className="text-lg">{t("Set up your listing in a few steps.")}</p>
        </div>
        <LocaleLink
          href="/sell"
          className={cn(buttonVariants({ size: "lg" }), "relative bg-primary-foreground text-primary hover:bg-primary-foreground/90")}
        >
          {t("Start selling")}
          <ArrowRightIcon data-icon="inline-end" />
        </LocaleLink>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const t = await getT();
  return (
    <>
      <Hero t={t} />

      <section aria-labelledby="platforms-heading" className="flex flex-col gap-6 pt-20">
        <h2 id="platforms-heading" className="sr-only">
          {t("Platforms")}
        </h2>
        <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
          <PlatformTiles />
        </Suspense>
      </section>

      <Bento t={t} />

      <section className="flex flex-col gap-12 pt-32">
        <SectionHeading
          eyebrow={t("Browse the market")}
          action={
            <LocaleLink href="/accounts" className={buttonVariants({ variant: "outline" })}>
              {t("View all")}
              <ArrowRightIcon data-icon="inline-end" />
            </LocaleLink>
          }
        >
          <span className="text-gold">{t("New")}</span> {t("accounts")}
        </SectionHeading>
        <Suspense
          fallback={
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-80 rounded-xl" />
              ))}
            </div>
          }
        >
          <Featured />
        </Suspense>
      </section>

      <QuickFilters t={t} />
      <HowItWorks t={t} />

      <Suspense fallback={null}>
        <TopSellers />
      </Suspense>

      <SellCta t={t} />
    </>
  );
}
