"use client";

import { useState } from "react";
import { ArrowRightIcon, LayoutGridIcon, SparklesIcon } from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { PlatformLogo } from "@/components/platform-logo";
import { buttonVariants } from "@/components/ui/button";
import { platforms, type PlatformId } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type MarketItem = { id: string; platform: string; card: React.ReactNode };

/** በመነሻ ገጹ ላይ ያለው ገበያ፦ ትናንሽ የፕላትፎርም አዝራሮች አካውንቶቹን ያጣራሉ (ገጹ ሳይጫን)። */
export function MarketBrowser({ items, counts }: { items: MarketItem[]; counts: Record<string, number> }) {
  const t = useT();
  const [selected, setSelected] = useState<PlatformId | "all">("all");
  const visible = selected === "all" ? items : items.filter((item) => item.platform === selected);
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const selectedName = platforms.find((platform) => platform.id === selected)?.name;

  const chip = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 backdrop-blur-sm transition-all",
      active ? "bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/25" : "bg-card/60 text-muted-foreground ring-foreground/10 hover:text-foreground hover:ring-foreground/30"
    );

  return (
    <div className="flex flex-col gap-6">
      <div role="toolbar" aria-label={t("Platforms")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" aria-pressed={selected === "all"} onClick={() => setSelected("all")} className={chip(selected === "all")}>
          <LayoutGridIcon className="size-4" />
          {t("All")}
          <span className="text-xs opacity-70">{total}</span>
        </button>
        {platforms.map((platform) => (
          <button
            key={platform.id}
            type="button"
            aria-pressed={selected === platform.id}
            onClick={() => setSelected(platform.id)}
            className={chip(selected === platform.id)}
          >
            <PlatformLogo id={platform.id} mono={selected === platform.id} />
            {platform.name}
            <span className="text-xs opacity-70">{counts[platform.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-foreground/15 bg-card/40 p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
            <SparklesIcon className="size-5" />
          </span>
          <p className="font-semibold">{selectedName ? t("No {platform} accounts yet.", { platform: selectedName }) : t("No listings yet")}</p>
          <LocaleLink href="/sell" className={buttonVariants({ size: "sm" })}>
            {t("Sell an account")}
          </LocaleLink>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div key={item.id}>{item.card}</div>
          ))}
        </div>
      )}

      <LocaleLink
        href={selected === "all" ? "/accounts" : `/accounts?platform=${selected}`}
        className={cn(buttonVariants({ variant: "outline" }), "self-center rounded-full px-6")}
      >
        {selectedName ? t("All {platform} accounts", { platform: selectedName }) : t("View all")}
        <ArrowRightIcon data-icon="inline-end" />
      </LocaleLink>
    </div>
  );
}
