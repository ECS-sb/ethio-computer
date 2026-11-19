import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** ደረጃ (1-5)፤ የተሞሉት ኮከቦች በወርቃማ። */
export function Stars({ value, label, className }: { value: number; label: string; className?: string }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={label} className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} aria-hidden className={cn("size-4", index < filled ? "fill-primary text-primary" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}
