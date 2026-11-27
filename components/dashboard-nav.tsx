"use client";

import { usePathname } from "next/navigation";
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CreditCardIcon,
  HandCoinsIcon,
  ListIcon,
  MessageCircleIcon,
  ReceiptIcon,
  MessagesSquareIcon,
  SettingsIcon,
  SmartphoneIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StoreIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { stripLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
import { cn } from "@/lib/utils";

/** የተጠቃሚው ዳሽቦርድ ምናሌ (የአድሚኑ በcomponents/admin-shell.tsx ነው)። */
type Group = { title: MessageKey; items: { href: string; label: MessageKey; icon: LucideIcon }[] };

const groups: Record<"user", Group[]> = {
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
      title: "Talent",
      items: [
        { href: "/dashboard/jobs", label: "Jobs", icon: BriefcaseIcon },
        { href: "/dashboard/talent", label: "My services", icon: SparklesIcon },
      ],
    },
    {
      title: "Electronics",
      items: [
        { href: "/dashboard/electronics", label: "My items", icon: SmartphoneIcon },
        { href: "/dashboard/electronics/deals", label: "Electronics chats", icon: MessagesSquareIcon },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/dashboard/wallet", label: "Wallet", icon: WalletIcon },
        { href: "/dashboard/subscriptions", label: "My subscriptions", icon: CreditCardIcon },
        { href: "/dashboard/verification", label: "Seller verification", icon: BadgeCheckIcon },
        { href: "/dashboard/messages", label: "Messages", icon: MessageCircleIcon },
        { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
      ],
    },
  ],
};

/** የተጠቃሚው ዳሽቦርድ ምናሌ። */
export function DashboardNav({ area }: { area: keyof typeof groups }) {
  const t = useT();
  const pathname = stripLocale(usePathname());

  return (
    <nav aria-label={t("Dashboard")} className="flex gap-4 overflow-x-auto [scrollbar-width:none] lg:flex-col">
      {groups[area].map((group) => (
        <div key={group.title} className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
          <p className="hidden px-4 pt-2 text-xs font-semibold text-muted-foreground lg:block">{t(group.title)}</p>
          {group.items.map((item) => {
            const hasSubpages = ["/dashboard/messages", "/dashboard/jobs", "/dashboard/talent", "/dashboard/electronics", "/dashboard/electronics/deals", "/dashboard/subscriptions"].includes(item.href);
            // ንዑስ ገጹ የራሱ ሊንክ ካለው (ለምሳሌ /dashboard/buyer/orders) የወላጁ ሊንክ አይበራም።
            const ownedByChild = group.items.some(
              (other) => other.href.startsWith(`${item.href}/`) && (pathname === other.href || pathname.startsWith(`${other.href}/`))
            );
            const active = pathname === item.href || (hasSubpages && pathname.startsWith(`${item.href}/`) && !ownedByChild);
            return (
              <LocaleLink
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{t(item.label)}</span>
              </LocaleLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
