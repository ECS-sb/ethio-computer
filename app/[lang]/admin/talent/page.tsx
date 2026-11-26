import Image from "next/image";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { ReviewForm } from "@/components/review-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/session";
import { resolveJobAction, reviewGigAction } from "@/lib/talent-actions";
import { gigCategory, jobStatusLabels } from "@/lib/talent-catalog";
import { getAdminJobs, getPendingGigs } from "@/lib/talent-queries";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Talent");

export default async function AdminTalentPage() {
  const t = await getT();
  const { can } = await requireStaff("/admin/talent", "listings", "ordersDecide");
  const [gigs, jobs, user] = await Promise.all([can.listings ? getPendingGigs() : [], can.ordersDecide ? getAdminJobs() : [], getCurrentUser()]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("Talent")}</h1>
        {user?.isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <LocaleLink href="/dashboard/talent" className={buttonVariants({ variant: "outline" })}>
              {t("Our services")}
            </LocaleLink>
            <LocaleLink href="/dashboard/talent/new" className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              {t("Post an Ethio Computer service")}
            </LocaleLink>
          </div>
        ) : null}
      </div>

      {can.listings ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Services to review")}</h2>
          {gigs.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("Nothing to review.")}</p>
          ) : (
            gigs.map((gig) => (
              <article key={gig.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t(gigCategory(gig.category)?.label ?? "Other")}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(t, gig.priceEtb)} · {t("{days} days", { days: gig.deliveryDays })} · {formatDate(gig.createdAt)}
                  </span>
                </div>
                <h3 className="font-semibold">{gig.title}</h3>
                <p className="text-sm break-all text-muted-foreground">
                  {gig.freelancer.name} ({gig.freelancer.email})
                </p>
                <p className="text-sm break-words whitespace-pre-line">{gig.description}</p>
                {gig.samples.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {gig.samples.map((sample) =>
                      sample.kind === "image" ? (
                        <a key={sample.id} href={`/api/talent-files/sample/${sample.id}`} target="_blank" rel="noopener noreferrer">
                          <Image
                            unoptimized
                            src={`/api/talent-files/sample/${sample.id}?size=thumb`}
                            alt={t("Portfolio")}
                            width={sample.width ?? 320}
                            height={sample.height ?? 180}
                            className="h-28 w-auto rounded-xl bg-secondary object-cover ring-1 ring-foreground/10"
                          />
                        </a>
                      ) : (
                        <audio key={sample.id} controls preload="none" src={`/api/talent-files/sample/${sample.id}`} className="w-full max-w-sm" />
                      )
                    )}
                  </div>
                ) : null}
                {gig.portfolioLinks.length > 0 ? (
                  <ul className="flex flex-col gap-1">
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
                <p className="text-xs text-muted-foreground">{t("Check that the samples and links don't show phone numbers or other contacts.")}</p>
                <ReviewForm action={reviewGigAction} id={gig.id} approveLabel={t("Approve")} />
              </article>
            ))
          )}
        </section>
      ) : null}

      {can.ordersDecide ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{t("Open jobs")}</h2>
          {jobs.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No open jobs.")}</p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={job.status === "DISPUTED" ? "destructive" : "secondary"}>{t(jobStatusLabels[job.status])}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(t, job.amountEtb)} · {formatDate(job.createdAt)}
                    {job.dueAt ? ` · ${t("Due {date}", { date: formatDate(job.dueAt) })}` : ""}
                  </span>
                </div>
                <h3 className="font-semibold">{job.gig.title}</h3>
                <p className="text-sm break-all text-muted-foreground">
                  {t("Client:")} {job.client.name} ({job.client.email})
                </p>
                <p className="text-sm break-all text-muted-foreground">
                  {t("Pro:")} {job.freelancer.name} ({job.freelancer.email})
                </p>
                <p className="line-clamp-3 text-sm break-words whitespace-pre-line">{job.brief}</p>
                <div className="flex flex-wrap gap-2">
                  <LocaleLink href={`/admin/talent/${job.threadId}`} className={buttonVariants({ variant: "outline" })}>
                    {t("Read the chat")}
                  </LocaleLink>
                  {job.status !== "REQUESTED" ? (
                    <ActionButton action={resolveJobAction} id={job.id} fields={{ decision: "release" }}>
                      {t("Pay the pro")}
                    </ActionButton>
                  ) : null}
                  <ActionButton action={resolveJobAction} id={job.id} fields={{ decision: "refund" }} variant="outline">
                    {t("Refund the client")}
                  </ActionButton>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </>
  );
}
