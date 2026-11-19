import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/generated/prisma/enums";
import { getT } from "@/lib/i18n-server";
import { jobStages, jobStatusLabels } from "@/lib/talent-catalog";
import { cn } from "@/lib/utils";

export async function JobProgress({ status }: { status: JobStatus }) {
  const t = await getT();
  if (!jobStages.includes(status)) {
    return <Badge variant={status === "DISPUTED" ? "destructive" : "secondary"}>{t(jobStatusLabels[status])}</Badge>;
  }
  const current = jobStages.indexOf(status);
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {jobStages.map((stage, index) => {
        const reached = index <= current;
        return (
          <li key={stage} aria-current={index === current ? "step" : undefined} className="flex items-center gap-2 sm:flex-col sm:items-start">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                reached ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}
            >
              {reached ? <CheckIcon className="size-4" /> : index + 1}
            </span>
            <span className={cn("text-xs", reached ? "text-foreground" : "text-muted-foreground")}>{t(jobStatusLabels[stage])}</span>
          </li>
        );
      })}
    </ol>
  );
}
