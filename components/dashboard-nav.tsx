"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  BadgeCheckIcon,
  BadgeDollarSignIcon,
  BriefcaseIcon,
  ChartNoAxesCombinedIcon,
  FlagIcon,
  GraduationCapIcon,
  HandCoinsIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  KeyRoundIcon,
  ListIcon,
  MessageCircleIcon,
  ReceiptIcon,
  SendIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StoreIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { useSidebarCompact } from "@/components/sidebar-layout";
import { stripLocale } from "@/lib/i18n";
import { SCHOOL_INBOX } from "@/lib/telegram/permissions";
import type { MessageKey } from "@/lib/messages";
import { cn } from "@/lib/utils";

/** staffOnly፦ ለሰራተኞች ብቻ የሚታይ (አድሚኑ በGoogle ስለሚገባ ፓስዎርድ የለውም)። */
type Group = { title: MessageKey; items: { href: string; label: MessageKey; icon: LucideIcon; staffOnly?: boolean }[] };

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
      title: "Talent",
      items: [
        { href: "/dashboard/jobs", label: "Jobs", icon: BriefcaseIcon },
        { href: "/dashboard/talent", label: "My services", icon: SparklesIcon },
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
        { href: "/admin/talent", label: "Talent", icon: BriefcaseIcon },
        { href: "/admin/telegram", label: "Sales Telegram", icon: SendIcon },
        { href: SCHOOL_INBOX, label: "School Telegram", icon: GraduationCapIcon },
        { href: "/admin/telegram/sales", label: "Telegram sales", icon: BadgeDollarSignIcon },
        { href: "/admin/telegram/channels", label: "Channels & profit", icon: ChartNoAxesCombinedIcon },
        { href: "/admin/telegram/staff", label: "Staff", icon: UserCogIcon },
        { href: "/admin/password", label: "Change password", icon: KeyRoundIcon, staffOnly: true },
      ],
    },
  ],
};

/** only፦ ሰራተኞች (አድሚን ያልሆኑ) የተፈቀደላቸውን ገጾች ብቻ ያያሉ፤ የቡድኑ ርዕስ አይታይም። */
export function DashboardNav({ area, only }: { area: keyof typeof groups; only?: string[] }) {
  const t = useT();
  const pathname = stripLocale(usePathname());
  // የሽያጩና የትምህርት ቤቱ ቴሌግራም አንድ ገጽ ናቸው፤ የሚለዩት በ?category= ነው።
  const category = useSearchParams().get("category") ?? "sales";
  // ምናሌው ሲጠብ (በኮምፒውተር ስክሪን) አዶዎቹ ብቻ ይታያሉ፤ ስሙ በtitle እና ለስክሪን አንባቢ ይቀራል።
  const compact = useSidebarCompact();

  return (
    <nav aria-label={t("Dashboard")} className="flex gap-4 overflow-x-auto [scrollbar-width:none] lg:flex-col">
      {groups[area]
        .map((group) => ({ ...group, items: group.items.filter((item) => (only ? only.includes(item.href) : !item.staffOnly)) }))
        .filter((group) => group.items.length > 0)
        .map((group) => (
        <div key={group.title} className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
          {only ? null : <p className={cn("hidden px-4 pt-2 text-xs font-semibold text-muted-foreground", compact ? "lg:sr-only" : "lg:block")}>{t(group.title)}</p>}
          {group.items.map((item) => {
            const [itemPath, itemQuery] = item.href.split("?");
            const itemCategory = new URLSearchParams(itemQuery).get("category") ?? "sales";
            const hasSubpages = ["/dashboard/messages", "/dashboard/jobs", "/dashboard/talent", "/admin/telegram", SCHOOL_INBOX, "/admin/telegram/channels", "/admin/talent"].includes(item.href);
            // ንዑስ ገጹ የራሱ ሊንክ ካለው (ለምሳሌ /admin/telegram/sales) የወላጁ ሊንክ አይበራም።
            const ownedByChild = group.items.some(
              (other) => other.href.startsWith(`${itemPath}/`) && (pathname === other.href || pathname.startsWith(`${other.href}/`))
            );
            const samePage = pathname === itemPath || (hasSubpages && pathname.startsWith(`${itemPath}/`) && !ownedByChild);
            const active = samePage && (itemPath !== "/admin/telegram" || itemCategory === category);
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
