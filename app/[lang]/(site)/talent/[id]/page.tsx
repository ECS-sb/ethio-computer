import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon, BadgeCheckIcon, ClockIcon, ExternalLinkIcon, MessageCircleIcon, ShieldCheckIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { HireForm } from "@/components/talent/hire-form";
import { StartChatButton } from "@/components/talent/start-chat-button";
import { Stars } from "@/components/talent/stars";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getWalletBalance } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { gigCategory, gigStatusLabels, TALENT_FEE_PERCENT } from "@/lib/talent-catalog";
import { getGigForViewer } from "@/lib/talent-queries";

export const generateMetadata = pageTitle("Service details");

type Props = { params: Promise<{ id: string }> };

async function GigContent({ params }: Props) {
  await connection();
  const t = await getT();
  const { id } = await params;
  const viewer = await getCurrentUser();
  const found = await getGigForViewer(id, viewer);
  if (!found) notFound();
  const { gig, isOwner, threadId, rating, completedJobs, reviews } = found;
  const category = gigCategory(gig.category);
  const balance = viewer && !isOwner ? await getWalletBalance(viewer.id) : 0;
  const loginHref = `/login?next=${encodeURIComponent(`/talent/${gig.id}`)}`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {gig.official ? <Badge>{t("Official")}</Badge> : null}
            <Badge variant="outline">{t(category?.label ?? "Other")}</Badge>
            {gig.status !== "APPROVED" ? <Badge variant="secondary">{t(gigStatusLabels[gig.status])}</Badge> : null}
          </div>
          <h1 className="text-3xl font-semibold text-balance">{gig.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              {gig.freelancerName}
              {gig.verified ? <BadgeCheckIcon aria-label={t("Verified")} className="size-4 text-primary" /> : null}
            </span>
            {rating ? (
              <span className="flex items-center gap-2">
                <Stars value={rating.average} label={t("Rated {rating} out of 5", { rating: rating.average.toFixed(1) })} />
                {rating.average.toFixed(1)} ({rating.count})
              </span>
            ) : (
              <span>{t("New pro")}</span>
            )}
            <span>{t("{count} jobs completed", { count: completedJobs })}</span>
          </div>
          {gig.status === "REJECTED" && gig.rejectReason ? (
            <p className="rounded-xl bg-destructive/10 p-4 text-sm ring-1 ring-destructive/40">{t("Rejected: {reason}", { reason: gig.rejectReason })}</p>
          ) : null}
        </header>

        {gig.images.length > 0 || gig.audios.length > 0 || gig.portfolioLinks.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">{t("Portfolio")}</h2>
            {gig.images.length > 0 ? <ScreenshotGallery images={gig.images} src="/api/talent-files/sample/{id}" /> : null}
            {gig.audios.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {gig.audios.map((audio, index) => (
                  <li key={audio.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-4 ring-1 ring-foreground/10">
                    <span className="text-sm font-medium">{t("Voice sample {number}", { number: index + 1 })}</span>
                    <audio controls preload="none" src={`/api/talent-files/sample/${audio.id}`} className="w-full" />
                  </li>
                ))}
              </ul>
            ) : null}
            {gig.portfolioLinks.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {gig.portfolioLinks.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="flex w-fit items-center gap-2 text-sm text-primary hover:underline">
                      <ExternalLinkIcon className="size-4 shrink-0" />
                      <span className="break-all" dir="ltr">
                        {link}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <h2 className="text-xl font-semibold">{t("About this service")}</h2>
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{gig.description}</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Reviews")}</h2>
          {reviews.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">{t("No reviews yet.")}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{review.clientName}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                  <Stars value={review.rating} label={t("Rated {rating} out of 5", { rating: review.rating })} />
                  {review.comment ? <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{review.comment}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside id="hire" className="flex scroll-mt-24 flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-primary/30 lg:sticky lg:top-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("Starting at")}</p>
            <p className="font-heading text-3xl font-bold text-primary">{formatPrice(t, gig.priceEtb)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <ClockIcon className="size-4" />
            {t("Delivery in {days} days", { days: gig.deliveryDays })}
          </span>
        </div>
        {isOwner ? (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("This is your service. Clients see this page.")}</p>
            <p>
              {gig.official
                ? t("This is an Ethio Computer service. The full amount goes to your wallet when the client approves.")
                : t("Ethio Computer keeps {percent}% of each job; you get the rest when the client approves.", { percent: TALENT_FEE_PERCENT })}
            </p>
            <LocaleLink href="/dashboard/talent" className={buttonVariants({ variant: "outline" })}>
              {t("My services")}
            </LocaleLink>
          </div>
        ) : !viewer ? (
          <div className="flex flex-col gap-2">
            <LocaleLink href={loginHref} className={buttonVariants({ size: "lg" })}>
              {t("Sign in to hire")}
            </LocaleLink>
            <LocaleLink href={loginHref} className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("Sign in to ask a question")}
            </LocaleLink>
          </div>
        ) : gig.status !== "APPROVED" ? (
          <p className="text-sm text-muted-foreground">{t("This service isn't available right now.")}</p>
        ) : (
          <>
            {threadId ? (
              <LocaleLink href={`/dashboard/jobs/${threadId}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
                <MessageCircleIcon data-icon="inline-start" />
                {t("Open the chat")}
              </LocaleLink>
            ) : (
              <StartChatButton gigId={gig.id} />
            )}
            <div className="flex flex-col gap-2 border-t border-border pt-6">
              <h2 className="font-semibold">{t("Hire")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("Wallet balance: {amount}", { amount: formatPrice(t, balance) })}{" "}
                {balance < gig.priceEtb ? (
                  <LocaleLink href="/dashboard/wallet" className="text-primary hover:underline">
                    {t("Add money")}
                  </LocaleLink>
                ) : null}
              </p>
            </div>
            <HireForm gigId={gig.id} minPrice={gig.priceEtb} />
          </>
        )}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          {t("Your money is held by Ethio Computer and reaches the pro only after you approve the work. If the pro declines, you get it all back.")}
        </p>
      </aside>
    </div>
  );
}

export default async function GigPage({ params }: Props) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-6 pt-12">
      <LocaleLink href="/talent" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("All pros")}
      </LocaleLink>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-xl" />}>
        <GigContent params={params} />
      </Suspense>
    </div>
  );
}
