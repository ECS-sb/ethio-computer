import { CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { productOrderLabels, productOrderStages } from "@/lib/electronics-catalog";
import type { ProductOrderStatus } from "@/lib/generated/prisma/enums";
import { getT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export async function ProductOrderProgress({ status }: { status: ProductOrderStatus }) {
  const t = await getT();
  if (!productOrderStages.includes(status)) {
    return <Badge variant={status === "DISPUTED" ? "destructive" : "secondary"}>{t(productOrderLabels[status])}</Badge>;
  }
  const current = productOrderStages.indexOf(status);
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {productOrderStages.map((stage, index) => {
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
            <span className={cn("text-xs", reached ? "text-foreground" : "text-muted-foreground")}>{t(productOrderLabels[stage])}</span>
          </li>
        );
      })}
    </ol>
  );
}
