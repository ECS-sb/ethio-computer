import type { PlatformId } from "@/lib/catalog";
import { platformLogoPaths } from "@/lib/platform-logos";
import { cn } from "@/lib/utils";

const brandFill: Record<PlatformId, string> = {
  instagram: "fill-[#E1306C]",
  tiktok: "fill-foreground",
  youtube: "fill-[#FF0033]",
  telegram: "fill-[#26A5E4]",
  facebook: "fill-[#0866FF]",
  x: "fill-foreground",
};

/** የፕላትፎርሙ ትክክለኛ ሎጎ በብራንድ ቀለሙ (mono ሲሆን በጽሑፉ ቀለም)። */
export function PlatformLogo({ id, mono = false, className }: { id: PlatformId; mono?: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("size-4 shrink-0", mono ? "fill-current" : brandFill[id], className)}>
      <path d={platformLogoPaths[id]} />
    </svg>
  );
}
