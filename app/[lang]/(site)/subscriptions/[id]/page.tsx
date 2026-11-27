import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { SubscriptionOrderForm } from "@/components/subscriptions/order-form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { chapaEnabled } from "@/lib/chapa";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getWalletBalance } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { subscriptionCategory } from "@/lib/subscription-catalog";
import { getStoreService } from "@/lib/subscription-queries";
import { isMessageKey } from "@/lib/talent-catalog";

export const generateMetadata = pageTitle("Subscriptions");

type Props = { params: Promise<{ id: string }> };

async function ServiceContent({ params }: Props) {
  await connection();
  const t = await getT();
  const { id } = await params;
  const [service, user] = await Promise.all([getStoreService(id), getCurrentUser()]);
  if (!service) notFound();
  const balance = user ? await getWalletBalance(user.id) : 0;
  const category = subscriptionCategory(service.category);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex items-center gap-4">
          <ServiceLogo name={service.name} logoUrl={service.logoUrl} className="size-16" />
          <div className="flex flex-col gap-2">
            <span className="flex flex-wrap gap-2">
              {category ? <Badge variant="outline">{t(category.label)}</Badge> : null}
              {service.onSale ? <Badge variant="destructive">{t("Discount")}</Badge> : null}
              <Badge variant={service.instant ? "default" : "secondary"}>{service.instant ? t("Instant: code right after paying") : t("Activated by our team within hours")}</Badge>
            </span>
            <h1 className="text-3xl font-semibold text-balance">{service.name}</h1>
          </div>
        </header>
        <p className="text-muted-foreground">{isMessageKey(service.description) ? t(service.description) : service.description}</p>
        <ol className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          {(["Choose a plan and enter your account details.", "Pay from your wallet or with Chapa.", "We buy it with our card and activate it, usually within a few hours.", "You see the confirmation on My subscriptions."] as const).map(
            (step, index) => (
              <li key={step} className="flex items-start gap-4 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                {t(step)}
              </li>
            )
          )}
        </ol>
      </div>
      <aside className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-primary/30 lg:sticky lg:top-24">
        <SubscriptionOrderForm
          plans={service.plans.map((plan) => ({ ...plan, label: isMessageKey(plan.label) ? t(plan.label) : plan.label }))}
          requiredInfo={service.requiredInfo}
          balance={balance}
          chapa={chapaEnabled()}
          signedIn={Boolean(user && !user.suspended)}
          loginHref={`/login?next=${encodeURIComponent(`/subscriptions/${service.id}`)}`}
        />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          {t("If we can't activate it, the full amount goes back to your wallet.")}
        </p>
      </aside>
    </div>
  );
}

export default async function SubscriptionServicePage({ params }: Props) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-6 pt-12">
      <LocaleLink href="/subscriptions" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("All subscriptions")}
      </LocaleLink>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <ServiceContent params={params} />
      </Suspense>
    </div>
  );
}
