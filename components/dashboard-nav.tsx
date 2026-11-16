"use client";

import { usePathname } from "next/navigation";
import {
  BadgeCheckIcon,
  BadgeDollarSignIcon,
  ChartNoAxesCombinedIcon,
  FlagIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListIcon,
  MessageCircleIcon,
  ReceiptIcon,
  SendIcon,
  SettingsIcon,
  ShoppingBagIcon,
  StoreIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { useSidebarCompact } from "@/components/sidebar-layout";
import { stripLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
import { cn } from "@/lib/utils";

type Group = { title: MessageKey; items: { href: string; label: MessageKey; icon: LucideIcon }[] };

const groups: Record<"user" | "admin", Group[]> = {
  user: [
    {
      title: "Buyer",
      items: [
        { href: "/dashboard/buyer", label: "My offers", icon: ShoppingBagIcon },
        { href: "/dashboard/buyer/orders", label: "My purchases", icon: ReceiptIcon },
      ],
    },
    {
      title: "Seller",
      items: [
        { href: "/dashboard/seller", label: "My listings", icon: StoreIcon },
        { href: "/dashboard/seller/offers", label: "Received offers", icon: HandCoinsIcon },
        { href: "/dashboard/seller/orders", label: "My sales", icon: ListIcon },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/wallet", label: "Wallet", icon: WalletIcon },
        { href: "/dashboard/verification", label: "Seller verification", icon: BadgeCheckIcon },
        { href: "/dashboard/messages", label: "Messages", icon: MessageCircleIcon },
        { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
      ],
    },
  ],
  admin: [
    {
      title: "Admin",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
        { href: "/admin/listings", label: "Listing review", icon: ListChecksIcon },
        { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
        { href: "/admin/wallet", label: "Deposits & withdrawals", icon: WalletIcon },
        { href: "/admin/verifications", label: "Seller verification", icon: BadgeCheckIcon },
        { href: "/admin/users", label: "Users", icon: UsersIcon },
        { href: "/admin/reports", label: "Reports", icon: FlagIcon },
        { href: "/admin/telegram", label: "Telegram", icon: SendIcon },
        { href: "/admin/telegram/sales", label: "Telegram sales", icon: BadgeDollarSignIcon },
        { href: "/admin/telegram/channels", label: "Channels & profit", icon: ChartNoAxesCombinedIcon },
        { href: "/admin/telegram/staff", label: "Staff", icon: UserCogIcon },
      ],
    },
  ],
};

/** only፦ ሰራተኞች (አድሚን ያልሆኑ) የተፈቀደላቸውን የቴሌግራም ገጾች ብቻ ያያሉ፤ የቡድኑ ርዕስ አይታይም። */
export function DashboardNav({ area, only }: { area: keyof typeof groups; only?: string[] }) {
  const t = useT();
  const pathname = stripLocale(usePathname());
  // ምናሌው ሲጠብ (በኮምፒውተር ስክሪን) አዶዎቹ ብቻ ይታያሉ፤ ስሙ በtitle እና ለስክሪን አንባቢ ይቀራል።
  const compact = useSidebarCompact();

  return (
    <nav aria-label={t("Dashboard")} className="flex gap-4 overflow-x-auto [scrollbar-width:none] lg:flex-col">
      {groups[area]
        .map((group) => (only ? { ...group, items: group.items.filter((item) => only.includes(item.href)) } : group))
        .filter((group) => group.items.length > 0)
        .map((group) => (
        <div key={group.title} className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
          {only ? null : <p className={cn("hidden px-4 pt-2 text-xs font-semibold text-muted-foreground", compact ? "lg:sr-only" : "lg:block")}>{t(group.title)}</p>}
          {group.items.map((item) => {
            const hasSubpages = item.href === "/dashboard/messages" || item.href === "/admin/telegram" || item.href === "/admin/telegram/channels";
            // ንዑስ ገጹ የራሱ ሊንክ ካለው (ለምሳሌ /admin/telegram/sales) የወላጁ ሊንክ አይበራም።
            const ownedByChild = group.items.some(
              (other) => other.href.startsWith(`${item.href}/`) && (pathname === other.href || pathname.startsWith(`${other.href}/`))
            );
            const active = pathname === item.href || (hasSubpages && pathname.startsWith(`${item.href}/`) && !ownedByChild);
            return (
              <LocaleLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={compact ? t(item.label) : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors",
                  compact && "lg:justify-center lg:px-0",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className={cn(compact && "lg:sr-only")}>{t(item.label)}</span>
              </LocaleLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
