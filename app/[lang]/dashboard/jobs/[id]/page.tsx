import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon, DownloadIcon, SendIcon, ShieldAlertIcon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocaleLink } from "@/components/i18n-provider";
import { SelectInput } from "@/components/select-input";
import { ChatLog } from "@/components/talent/chat-log";
import { JobProgress } from "@/components/talent/job-progress";
import { Stars } from "@/components/talent/stars";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatPrice } from "@/lib/catalog";
import { MAX_CHAT_STRIKES } from "@/lib/chat-guard";
import { feeFor } from "@/lib/fees";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getChatStrikes } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import {
  acceptJobAction,
  approveJobAction,
  declineJobAction,
  deliverJobAction,
  openJobDisputeAction,
  requestRevisionAction,
  reviewJobAction,
  sendGigMessageAction,
} from "@/lib/talent-actions";
import { MAX_JOB_FILES, ratingOptions } from "@/lib/talent-catalog";
import { getThread, type ThreadJob } from "@/lib/talent-queries";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Workroom");

async function JobCard({ job, asClient }: { job: ThreadJob; asClient: boolean }) {
  const t = await getT();
  const payout = feeFor(job.amountEtb, job.feePercent).payoutEtb;
  const canDispute = job.status === "IN_PROGRESS" || job.status === "DELIVERED";

  return (
    <article className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-heading text-2xl font-bold text-primary">{formatPrice(t, job.amountEtb)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(job.createdAt)}
            {!asClient ? ` · ${t("You get {amount} after the fee", { amount: formatPrice(t, payout) })}` : ""}
          </p>
        </div>
        {job.dueAt && (job.status === "IN_PROGRESS" || job.status === "DELIVERED") ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <ClockIcon className="size-4" />
            {t("Due {date}", { date: formatDate(job.dueAt) })}
          </p>
        ) : null}
      </div>
      <JobProgress status={job.status} />
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-muted-foreground">{t("The job")}</p>
        <p className="text-sm break-words whitespace-pre-line">{job.brief}</p>
      </div>

      {job.deliveredAt && (job.deliveryNote || job.files.length > 0) ? (
        <div className="flex flex-col gap-2 rounded-xl bg-primary/10 p-4 ring-1 ring-primary/30">
          <p className="text-xs font-semibold text-primary">{t("Delivered work")}</p>
          {job.deliveryNote ? <p className="text-sm break-words whitespace-pre-line">{job.deliveryNote}</p> : null}
          {job.files.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {job.files.map((file) => (
                <li key={file.id} className="flex flex-col gap-2">
                  {file.mimeType.startsWith("audio/") ? <audio controls preload="none" src={`/api/talent-files/job/${file.id}`} className="w-full" /> : null}
                  <a href={`/api/talent-files/job/${file.id}?download=1`} className="flex w-fit items-center gap-2 text-sm text-primary hover:underline">
                    <DownloadIcon className="size-4" />
                    <span className="break-all">{file.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {job.revisionCount > 0 ? <p className="text-xs text-muted-foreground">{t("Changes requested: {count}", { count: job.revisionCount })}</p> : null}
        </div>
      ) : null}

      {/* የደንበኛው ተግባራት */}
      {asClient && job.status === "REQUESTED" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("The money is held safely. If the pro doesn't accept, cancel and it returns to your wallet.")}</p>
          <ActionButton action={declineJobAction} id={job.id} variant="outline" className="w-fit">
            {t("Cancel the request")}
          </ActionButton>
        </div>
      ) : null}
      {asClient && job.status === "DELIVERED" ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">{t("Check the work. Approve only if you're happy: the pro gets paid right away.")}</p>
          <ActionButton action={approveJobAction} id={job.id} size="lg" className="w-fit">
            {t("Approve and pay the pro")}
          </ActionButton>
          <ActionForm action={requestRevisionAction} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={job.id} />
            <Label htmlFor={`revision-${job.id}`}>{t("Need changes?")}</Label>
            <Textarea id={`revision-${job.id}`} name="note" required minLength={5} maxLength={2000} rows={3} placeholder={t("Explain what to change.")} />
            <SubmitButton variant="outline" className="w-fit">
              {t("Ask for changes")}
            </SubmitButton>
          </ActionForm>
        </div>
      ) : null}
      {asClient && job.status === "COMPLETED" && !job.review ? (
        <ActionForm action={reviewJobAction} className="flex flex-col gap-2 border-t border-border pt-4">
          <input type="hidden" name="id" value={job.id} />
          <p className="font-semibold">{t("Leave a review")}</p>
          <Label htmlFor={`rating-${job.id}`}>{t("Rating")}</Label>
          <SelectInput id={`rating-${job.id}`} name="rating" options={ratingOptions} defaultValue="5" />
          <Label htmlFor={`comment-${job.id}`}>{t("Comment")}</Label>
          <Textarea id={`comment-${job.id}`} name="comment" maxLength={1000} rows={3} placeholder={t("How was working with this pro?")} />
          <SubmitButton className="w-fit">{t("Post review")}</SubmitButton>
        </ActionForm>
      ) : null}
      {job.review ? (
        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground">{t("Review")}</p>
          <Stars value={job.review.rating} label={t("Rated {rating} out of 5", { rating: job.review.rating })} />
          {job.review.comment ? <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{job.review.comment}</p> : null}
        </div>
      ) : null}

      {/* የባለሙያው ተግባራት */}
      {!asClient && job.status === "REQUESTED" ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton action={acceptJobAction} id={job.id}>
            {t("Accept the job")}
          </ActionButton>
          <ActionButton action={declineJobAction} id={job.id} variant="outline">
            {t("Decline")}
          </ActionButton>
        </div>
      ) : null}
      {!asClient && job.status === "IN_PROGRESS" ? (
        <ActionForm action={deliverJobAction} className="flex flex-col gap-2 border-t border-border pt-4">
          <input type="hidden" name="id" value={job.id} />
          <p className="font-semibold">{t("Deliver the work")}</p>
          <Label htmlFor={`files-${job.id}`}>{t("Files (up to {count}, 4MB each)", { count: MAX_JOB_FILES })}</Label>
          <Input id={`files-${job.id}`} name="files" type="file" multiple />
          <Label htmlFor={`note-${job.id}`}>{t("Note or link")}</Label>
          <Textarea id={`note-${job.id}`} name="note" maxLength={2000} rows={3} placeholder={t("For big videos, paste a Google Drive, Dropbox or WeTransfer link.")} />
          <SubmitButton className="w-fit">{t("Deliver")}</SubmitButton>
        </ActionForm>
      ) : null}
      {!asClient && job.status === "DELIVERED" ? <p className="text-sm text-muted-foreground">{t("Waiting for the client to approve your work.")}</p> : null}
      {!asClient && job.status === "COMPLETED" && job.payoutEtb !== null ? (
        <p className="text-sm text-primary">{t("{amount} was added to your wallet.", { amount: formatPrice(t, job.payoutEtb) })}</p>
      ) : null}

      {canDispute ? (
        <ActionButton action={openJobDisputeAction} id={job.id} variant="ghost" size="sm" className="w-fit text-muted-foreground">
          {t("Report a problem to Ethio Computer")}
        </ActionButton>
      ) : null}
      {job.status === "DISPUTED" ? (
        <p className="text-sm text-muted-foreground">{t("An admin is reading this chat and will decide. Keep all messages here.")}</p>
      ) : null}
    </article>
  );
}

export default async function WorkroomPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const user = await requireUser(`/dashboard/jobs/${id}`);
  const [thread, strikes] = await Promise.all([getThread(id, user.id), getChatStrikes(user.id)]);
  if (!thread) notFound();
  const activeJob = thread.jobs.some((job) => ["REQUESTED", "IN_PROGRESS", "DELIVERED", "DISPUTED"].includes(job.status));

  return (
    <>
      <AutoRefresh />
      <LocaleLink href="/dashboard/jobs" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("All jobs")}
      </LocaleLink>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">{thread.gig.title}</h1>
        <p className="text-sm text-muted-foreground">
          {thread.asClient ? t("Pro: {name}", { name: thread.otherName }) : t("Client: {name}", { name: thread.otherName })} ·{" "}
          <LocaleLink href={`/talent/${thread.gig.id}`} className="hover:underline">
            {t("View the service")}
          </LocaleLink>
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-label={t("Chat")} className="flex min-w-0 flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div
            role="note"
            className={cn("flex items-start gap-2 rounded-xl p-4 text-xs ring-1", strikes > 0 ? "bg-destructive/10 ring-destructive/40" : "bg-primary/10 ring-primary/30")}
          >
            <ShieldAlertIcon className={cn("size-4 shrink-0", strikes > 0 ? "text-destructive" : "text-primary")} />
            <p>
              {t("Keep the whole job on Ethio Computer. If you pay or talk outside, we can't protect your money. Phone numbers, usernames, links and other apps are blocked, and the third attempt suspends your account.")}{" "}
              {strikes > 0 ? <strong>{t("Your warnings: {count} of {max}.", { count: strikes, max: MAX_CHAT_STRIKES })}</strong> : null}
            </p>
          </div>
          <div className="flex min-h-72 flex-col gap-2">
            <ChatLog messages={thread.messages} selfId={user.id} />
          </div>
          <ActionForm action={sendGigMessageAction} className="flex gap-2">
            <input type="hidden" name="threadId" value={thread.id} />
            <Input name="body" aria-label={t("Message")} placeholder={t("Write a message…")} required maxLength={2000} autoComplete="off" />
            <SubmitButton size="icon" aria-label={t("Send")} className="size-11">
              <SendIcon />
            </SubmitButton>
          </ActionForm>
        </section>

        <div className="flex flex-col gap-6">
          {thread.jobs.map((job) => (
            <JobCard key={job.id} job={job} asClient={thread.asClient} />
          ))}
          {thread.asClient && !activeJob && thread.gig.status === "APPROVED" ? (
            <div className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-primary/30">
              <p className="text-sm text-muted-foreground">
                {thread.jobs.length === 0
                  ? t("Ready to start? Hire the pro. Your money is held safely until you approve the work.")
                  : t("Need more work from this pro? Hire them again.")}
              </p>
              <LocaleLink href={`/talent/${thread.gig.id}#hire`} className={buttonVariants({ size: "lg" })}>
                {t("Hire from {amount}", { amount: formatPrice(t, thread.gig.priceEtb) })}
              </LocaleLink>
            </div>
          ) : null}
          {!thread.asClient && thread.jobs.length === 0 ? (
            <p className="rounded-xl bg-card/70 p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
              {t("The client hasn't hired you yet. Answer their questions here; when they hire, the job appears in this panel.")}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
