import { LocaleLink } from "@/components/i18n-provider";
import { HowToBuy } from "@/components/how-to-buy";
import { buttonVariants } from "@/components/ui/button";
import type { GuideId } from "@/lib/buying-guides";

type Action = { label: string; href: string; external?: boolean };

function ActionAnchor({ action, variant }: { action: Action; variant: "default" | "outline" }) {
  const className = buttonVariants({ size: "lg", variant });
  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.label}
      </a>
    );
  }
  if (action.href.startsWith("#") || action.href.startsWith("tel:")) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <LocaleLink href={action.href} className={className}>
      {action.label}
    </LocaleLink>
  );
}

/** ከገጹ መግቢያ ስር ያሉት ሁለቱ ዋና አዝራሮች (መግዛት/መሸጥ) እና ትንሹ "እንዴት ይገዛል?" መመሪያ። በሁሉም የገበያ ገጾች አንድ አይነት ነው። */
export function PageActions({ primary, secondary, guide }: { primary: Action; secondary: Action; guide: GuideId }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionAnchor action={primary} variant="default" />
      <ActionAnchor action={secondary} variant="outline" />
      <HowToBuy guide={guide} />
    </div>
  );
}
