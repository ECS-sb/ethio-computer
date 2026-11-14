"use client";

import { useId, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * የቻቱ ቀጭን ራስጌ፦ ስሙና ዝርዝሩ ከሰርቨር ይመጣሉ፤ በጥጉ ያለው ትንሽ "AI" አዝራር የAI ማጠቃለያውን
 * (ማስጠንቀቂያዎች፣ ስምምነቶች) ከራስጌው በታች ይከፍታል። በነባሪ ዝግ ነው፤ ቻቱ ለማንበብ ሰፊ ቦታ ያገኛል።
 */
export function ChatInsights({
  header,
  actions,
  panel,
  alertCount,
}: {
  header: React.ReactNode;
  actions: React.ReactNode;
  panel: React.ReactNode | null;
  alertCount: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const label = t("AI summary");

  return (
    <>
      <header className="flex items-center gap-2.5 border-b border-border px-3 py-1.5">
        {header}
        {panel ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            title={label}
            aria-label={alertCount > 0 ? `${label} · ${t("{count} alerts", { count: alertCount })}` : label}
            className={cn(
              "relative flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
              open ? "bg-primary/20 text-[var(--tg-link,var(--primary))]" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <SparklesIcon className="size-3.5" />
            AI
            {alertCount > 0 ? (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-white">
                {alertCount}
              </span>
            ) : null}
          </button>
        ) : null}
        {actions}
      </header>
      {panel && open ? (
        <div id={panelId} className="flex max-h-[45%] flex-col gap-4 overflow-y-auto border-b border-border px-4 py-3 text-sm">
          {panel}
        </div>
      ) : null}
    </>
  );
}
