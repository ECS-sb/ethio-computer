import { Suspense } from "react";
import { connection } from "next/server";
import { ShieldCheckIcon } from "lucide-react";
import { PageIntro } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { PageActions } from "@/components/page-actions";
import { GigCard } from "@/components/talent/gig-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GigCategory } from "@/lib/generated/prisma/enums";
import { getT, pageTitle } from "@/lib/i18n-server";
import { gigCategories, talentSteps } from "@/lib/talent-catalog";
import { getPublicGigs } from "@/lib/talent-queries";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Hire talent");

type Params = Promise<Record<string, string | string[] | undefined>>;

async function readCategory(searchParams: Params): Promise<GigCategory | undefined> {
  const raw = (await searchParams).category;
  return gigCategories.find((category) => category.value === raw)?.value;
}

async function CategoryChips({ searchParams }: { searchParams: Params }) {
  await connection();
  const t = await getT();
  const active = await readCategory(searchParams);
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
    <nav aria-label={t("Categories")} className="flex flex-wrap gap-2">
      {chip("/talent", t("All"), !active)}
      {gigCategories.map((category) => chip(`/talent?category=${category.value}`, t(category.label), active === category.value))}
    </nav>
  );
}

async function Results({ searchParams }: { searchParams: Params }) {
  await connection();
  const t = await getT();
  const category = await readCategory(searchParams);
  const gigs = await getPublicGigs(category);
  if (gigs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
        <p className="text-muted-foreground">{t("No pros in this category yet. Be the first to offer your skills.")}</p>
        <LocaleLink href="/dashboard/talent/new" className={buttonVariants()}>
          {t("Offer your skills")}
        </LocaleLink>
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {gigs.map((gig) => (
        <GigCard key={gig.id} gig={gig} />
      ))}
    </div>
  );
}

export default async function TalentPage({ searchParams }: { searchParams: Params }) {
  const t = await getT();
  return (
    <>
      <PageIntro
        eyebrow={t("Voice-over, thumbnails, editing and AI video")}
        title={
          <>
            {t("Hire a pro for your")} <span className="text-gold">{t("content.")}</span>
          </>
        }
        description={t("See their portfolio, chat on the site, and pay safely. The pro gets paid only when you approve the work.")}
      />
      <PageActions
        primary={{ label: t("Find a pro"), href: "#pros" }}
        secondary={{ label: t("Offer your skills"), href: "/dashboard/talent/new" }}
        guide="talent"
      />

      <ol className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {talentSteps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
            <h2 className="font-semibold">{t(step.title)}</h2>
            <p className="text-sm text-muted-foreground">{t(step.description)}</p>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm ring-1 ring-primary/30">
        <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
        {t("Talk and pay only on Ethio Computer. Phone numbers, usernames and outside links are blocked in the chat, so your money stays protected.")}
      </p>

      <section id="pros" className="flex scroll-mt-24 flex-col gap-6 pt-6">
        <Suspense fallback={<Skeleton className="h-10 w-full max-w-xl rounded-full" />}>
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
