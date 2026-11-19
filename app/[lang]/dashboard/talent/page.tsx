import { PlusIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { Stars } from "@/components/talent/stars";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";
import { setGigPausedAction } from "@/lib/talent-actions";
import { gigCategory, gigStatusLabels } from "@/lib/talent-catalog";
import { getMyGigs } from "@/lib/talent-queries";

export const generateMetadata = pageTitle("My services");

export default async function MyGigsPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/talent");
  const gigs = await getMyGigs(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("My services")}</h1>
        <LocaleLink href="/dashboard/talent/new" className={buttonVariants()}>
          <PlusIcon data-icon="inline-start" />
          {t("New service")}
        </LocaleLink>
      </div>
      {gigs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card/70 p-12 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">{t("Do voice-over, thumbnails, editing or AI video? Add a service and start getting jobs.")}</p>
          <LocaleLink href="/dashboard/talent/new" className={buttonVariants()}>
            {t("Offer your skills")}
          </LocaleLink>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {gigs.map((gig) => (
            <article key={gig.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={gig.status === "APPROVED" ? "default" : gig.status === "REJECTED" ? "destructive" : "secondary"}>
                  {t(gigStatusLabels[gig.status])}
                </Badge>
                <Badge variant="outline">{t(gigCategory(gig.category)?.label ?? "Other")}</Badge>
              </div>
              <h2 className="font-semibold">{gig.title}</h2>
              <p className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{formatPrice(t, gig.priceEtb)}</span>
                <span>{t("{count} jobs", { count: gig._count.jobs })}</span>
                {gig.rating ? (
                  <span className="flex items-center gap-2">
                    <Stars value={gig.rating.average} label={t("Rated {rating} out of 5", { rating: gig.rating.average.toFixed(1) })} />({gig.rating.count})
                  </span>
                ) : null}
              </p>
              {gig.status === "REJECTED" && gig.rejectReason ? <p className="text-sm text-destructive">{t("Rejected: {reason}", { reason: gig.rejectReason })}</p> : null}
              {gig.status === "PENDING" ? <p className="text-sm text-muted-foreground">{t("An admin is reviewing your service. It usually takes less than a day.")}</p> : null}
              <div className="flex flex-wrap gap-2">
                <LocaleLink href={`/talent/${gig.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {t("View")}
                </LocaleLink>
                {gig.status === "APPROVED" ? (
                  <ActionButton action={setGigPausedAction} id={gig.id} fields={{ paused: "true" }} variant="outline" size="sm">
                    {t("Pause")}
                  </ActionButton>
                ) : null}
                {gig.status === "PAUSED" ? (
                  <ActionButton action={setGigPausedAction} id={gig.id} fields={{ paused: "false" }} size="sm">
                    {t("Go live again")}
                  </ActionButton>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
