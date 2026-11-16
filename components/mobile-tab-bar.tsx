"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { HouseIcon, PlusIcon, StoreIcon, UserRoundIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { stripLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: MessageKey; icon: LucideIcon; exact?: boolean };

const tabs: Tab[] = [
  { href: "/", label: "Home", icon: HouseIcon, exact: true },
  { href: "/accounts", label: "Market", icon: StoreIcon },
  { href: "/sell", label: "Sell", icon: PlusIcon },
  { href: "/dashboard/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/dashboard", label: "Me", icon: UserRoundIcon, exact: true },
];

function Tabs({ pathname }: { pathname: string }) {
  const t = useT();
  return tabs.map((tab) => {
    const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    const sell = tab.href === "/sell";
    return (
      <LocaleLink
        key={tab.href}
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}
      >
        {sell ? (
          <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-gold-2 text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background">
            <tab.icon className="size-6" />
          </span>
        ) : (
          <tab.icon className="size-5" />
        )}
        {t(tab.label)}
      </LocaleLink>
    );
  });
}

function ActiveTabs() {
  return <Tabs pathname={stripLocale(usePathname())} />;
}

/** በስልክ ላይ ከታች የሚቆም አሞሌ፦ ዋና ቦታዎቹ በአንድ ንክኪ (ምናሌ መክፈት ሳያስፈልግ)። */
export function MobileTabBar() {
  const t = useT();
  return (
    <>
      <div aria-hidden className="h-20 lg:hidden" />
      <nav
        aria-label={t("Quick menu")}
        className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-foreground/10 bg-card/80 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      >
        <Suspense fallback={<Tabs pathname="" />}>
          <ActiveTabs />
        </Suspense>
      </nav>
    </>
  );
}
