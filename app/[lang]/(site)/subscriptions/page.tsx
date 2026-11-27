import { Suspense } from "react";
import { connection } from "next/server";
import { ShieldCheckIcon } from "lucide-react";
import { PageIntro, PlatformMark } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { PageActions } from "@/components/page-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { serviceMark } from "@/lib/subscription-catalog";
import { getSubscriptionStore } from "@/lib/subscription-queries";
import { isMessageKey } from "@/lib/talent-catalog";

export const generateMetadata = pageTitle("Subscriptions");

async function Store() {
  await connection();
  const t = await getT();
  const categories = await getSubscriptionStore();
  if (categories.length === 0) {
    return (
      <p className="rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10">
        {t("Subscriptions are coming soon. Message us on Telegram for any subscription you need.")}
      </p>
    );
  }
  return (
    <>
      <nav aria-label={t("Categories")} className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <a
            key={category.value}
            href={`#${category.value.toLowerCase()}`}
            className="rounded-full bg-card/70 px-4 py-2 text-sm font-medium ring-1 ring-foreground/10 transition-colors hover:ring-primary/60"
          >
            {t(category.label)} <span className="text-muted-foreground">({category.services.length})</span>
          </a>
        ))}
      </nav>
      {categories.map((category) => (
        <section key={category.value} id={category.value.toLowerCase()} className="flex scroll-mt-24 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold">{t(category.label)}</h2>
            <p className="text-sm text-muted-foreground">{t(category.hint)}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {category.services.map((service) => {
              const cheapest = Math.min(...service.plans.map((plan) => plan.price));
              return (
                <LocaleLink
                  key={service.id}
                  href={`/subscriptions/${service.id}`}
                  className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 transition-all hover:-translate-y-1 hover:ring-primary/60"
                >
                  <div className="flex items-center gap-4">
                    <PlatformMark mark={serviceMark(service.name)} className="size-12" />
                    <h3 className="font-semibold text-balance">{service.name}</h3>
                  </div>
                  <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {isMessageKey(service.description) ? t(service.description) : service.description}
                  </p>
                  <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">{t("{count} plans", { count: service.plans.length })}</span>
                    <span className="text-right">
                      <span className="block text-xs text-muted-foreground">{t("Starting at")}</span>
                      <span className="font-heading text-xl font-bold text-primary">{formatPrice(t, cheapest)}</span>
                    </span>
                  </div>
                </LocaleLink>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

export default async function SubscriptionsPage() {
  const t = await getT();
  return (
    <>
      <PageIntro
        eyebrow={t("VPN, AI tools, social media, movies and more")}
        title={
          <>
            {t("Pay for your subscriptions")} <span className="text-gold">{t("in birr.")}</span>
          </>
        }
        description={t("No card? We pay with ours. Choose a subscription, pay from your wallet or with Chapa, and we activate it on your account.")}
      />
      <PageActions
        primary={{ label: t("Choose a subscription"), href: "#store" }}
        secondary={{ label: t("My subscriptions"), href: "/dashboard/subscriptions" }}
        guide="subscriptions"
      />
      <p className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm ring-1 ring-primary/30">
        <ShieldCheckIcon className="size-5 shrink-0 text-primary" />
        {t("We never ask for your password. If we can't activate your subscription, the money goes back to your wallet.")}
      </p>
      <div id="store" className="flex scroll-mt-24 flex-col gap-12 pt-6">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <Store />
        </Suspense>
      </div>
    </>
  );
}
