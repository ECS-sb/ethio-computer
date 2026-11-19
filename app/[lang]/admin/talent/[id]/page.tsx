import { notFound } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { ChatLog } from "@/components/talent/chat-log";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { jobStatusLabels } from "@/lib/talent-catalog";
import { getThreadForAdmin } from "@/lib/talent-queries";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Talent");

/** አለመግባባት ሲኖር አድሚኑ ሙሉ ቻቱን፣ የስራውን ዝርዝርና የተረከቡትን ፋይሎች ያያል። */
export default async function AdminTalentThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  await requireStaff(`/admin/talent/${id}`, "ordersDecide");
  const thread = await getThreadForAdmin(id);
  if (!thread) notFound();
  const names = { [thread.clientId]: t("Client: {name}", { name: thread.client.name }), [thread.gig.freelancerId]: t("Pro: {name}", { name: thread.gig.freelancer.name }) };

  return (
    <>
      <LocaleLink href="/admin/talent" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("Talent")}
      </LocaleLink>
      <h1 className="text-2xl font-semibold text-balance">{thread.gig.title}</h1>
      {thread.jobs.map((job) => (
        <article key={job.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={job.status === "DISPUTED" ? "destructive" : "secondary"}>{t(jobStatusLabels[job.status])}</Badge>
            <span className="text-sm font-semibold text-primary">{formatPrice(t, job.amountEtb)}</span>
          </div>
          <p className="text-sm break-words whitespace-pre-line">{job.brief}</p>
          {job.deliveryNote ? <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{job.deliveryNote}</p> : null}
          {job.files.map((file) => (
            <a key={file.id} href={`/api/talent-files/job/${file.id}?download=1`} className="flex w-fit items-center gap-2 text-sm text-primary hover:underline">
              <DownloadIcon className="size-4" />
              <span className="break-all">{file.name}</span>
            </a>
          ))}
        </article>
      ))}
      <section aria-label={t("Chat")} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        <ChatLog messages={thread.messages} selfId={thread.gig.freelancerId} names={names} />
      </section>
    </>
  );
}
