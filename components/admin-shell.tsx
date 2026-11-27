"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BadgeCheckIcon,
  BadgeDollarSignIcon,
  BriefcaseIcon,
  ChartNoAxesCombinedIcon,
  ChevronDownIcon,
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  GraduationCapIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MegaphoneIcon,
  MenuIcon,
  MessageCircleIcon,
  PieChartIcon,
  ReceiptIcon,
  SendIcon,
  SmartphoneIcon,
  StoreIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { stripLocale } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
import { SCHOOL_ANALYTICS, SCHOOL_INBOX, SCHOOL_MARKETING } from "@/lib/telegram/permissions";
import { cn } from "@/lib/utils";

export const SIDEBAR_COOKIE = "admin_nav";

/** staffOnly፦ ለሰራተኞች ብቻ (አድሚኑ በGoogle ስለሚገባ ፓስዎርድ የለውም)። */
type Item = { href: string; label: MessageKey; icon: LucideIcon; staffOnly?: boolean };
type Section = { title: MessageKey; icon: LucideIcon; items: Item[] };

const home: Item = { href: "/admin", label: "Overview", icon: LayoutDashboardIcon };

const sections: Section[] = [
  {
    title: "Marketplace",
    icon: StoreIcon,
    items: [
      { href: "/admin/listings", label: "Listing review", icon: ListChecksIcon },
      { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
      { href: "/admin/reports", label: "Reports", icon: FlagIcon },
      { href: "/admin/talent", label: "Talent", icon: BriefcaseIcon },
      { href: "/admin/electronics", label: "Electronics", icon: SmartphoneIcon },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCardIcon },
      { href: "/admin/banners", label: "Banners", icon: MegaphoneIcon },
    ],
  },
  { title: "Money", icon: WalletIcon, items: [{ href: "/admin/wallet", label: "Deposits & withdrawals", icon: WalletIcon }] },
  {
    title: "People",
    icon: UsersIcon,
    items: [
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/verifications", label: "Seller verification", icon: BadgeCheckIcon },
      { href: "/admin/telegram/staff", label: "Staff", icon: UserCogIcon },
    ],
  },
  {
    title: "Sales Telegram",
    icon: SendIcon,
    items: [
      { href: "/admin/telegram", label: "Chats", icon: MessageCircleIcon },
      { href: "/admin/telegram/sales", label: "Telegram sales", icon: BadgeDollarSignIcon },
      { href: "/admin/telegram/channels", label: "Channels & profit", icon: ChartNoAxesCombinedIcon },
    ],
  },
  {
    title: "School",
    icon: GraduationCapIcon,
    items: [
      { href: SCHOOL_INBOX, label: "School Telegram", icon: MessageCircleIcon },
      { href: SCHOOL_ANALYTICS, label: "School analytics", icon: PieChartIcon },
      { href: SCHOOL_MARKETING, label: "Telegram marketing", icon: MegaphoneIcon },
    ],
  },
  { title: "Account", icon: UserIcon, items: [{ href: "/admin/password", label: "Change password", icon: KeyRoundIcon, staffOnly: true }] },
];

const allItems = [home, ...sections.flatMap((section) => section.items)];

// ንዑስ ገጾቻቸው (ለምሳሌ /admin/telegram/{id}) ሲከፈቱም የሚበሩ።
const withSubpages = new Set(["/admin/telegram", SCHOOL_INBOX, "/admin/telegram/channels", "/admin/talent", "/admin/electronics", SCHOOL_ANALYTICS]);

/** የሽያጩና የትምህርት ቤቱ ቴሌግራም አንድ ገጽ ናቸው (በ?category= ይለያሉ)፤ የራሱ ሊንክ ያለው ንዑስ ገጽ የወላጁን አያበራም። */
function isActive(item: Item, pathname: string, category: string): boolean {
  const [itemPath, itemQuery] = item.href.split("?");
  const itemCategory = new URLSearchParams(itemQuery).get("category") ?? "sales";
  const ownedByChild = allItems.some(
    (other) => other !== item && other.href.startsWith(`${itemPath}/`) && (pathname === other.href || pathname.startsWith(`${other.href}/`))
  );
  const samePage = pathname === itemPath || (withSubpages.has(item.href) && pathname.startsWith(`${itemPath}/`) && !ownedByChild);
  return samePage && (itemPath !== "/admin/telegram" || itemCategory === category);
}

type User = { name: string; email: string; image: string | null };

function useNavState(only?: string[]) {
  const pathname = stripLocale(usePathname());
  const category = useSearchParams().get("category") ?? "sales";
  const allowed = (item: Item) => (only ? only.includes(item.href) : !item.staffOnly);
  const visible = sections.map((section) => ({ ...section, items: section.items.filter(allowed) })).filter((section) => section.items.length > 0);
  const active = allItems.find((item) => allowed(item) && isActive(item, pathname, category)) ?? null;
  return { visible, active, showHome: allowed(home), isOn: (item: Item) => item === active };
}

function NavLink({ item, on, compact, sub = false, onNavigate }: { item: Item; on: boolean; compact: boolean; sub?: boolean; onNavigate?: () => void }) {
  const t = useT();
  return (
    <LocaleLink
      href={item.href}
      onClick={onNavigate}
      aria-current={on ? "page" : undefined}
      title={compact ? t(item.label) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        sub && !compact && "ps-6",
        compact && "justify-center px-0",
        on ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span className={cn("truncate", compact && "sr-only")}>{t(item.label)}</span>
    </LocaleLink>
  );
}

/** ምድቦቹ ይታጠፋሉ፤ የአሁኑ ገጽ ያለበት ምድብ ተከፍቶ ይጀምራል። ሲጠብ አዶዎቹ ብቻ በምድብ ተለያይተው ይታያሉ። */
function SidebarNav({ only, compact, onNavigate }: { only?: string[]; compact: boolean; onNavigate?: () => void }) {
  const t = useT();
  const { visible, active, showHome, isOn } = useNavState(only);
  // እጅ ያልነካው ምድብ የአሁኑ ገጽ በውስጡ ሲኖር ይከፈታል።
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (section: Section) => toggled[section.title] ?? (active !== null && section.items.includes(active));
  const toggle = (section: Section) => setToggled((current) => ({ ...current, [section.title]: !isOpen(section) }));

  return (
    <nav aria-label={t("Dashboard")} className="flex flex-col gap-1">
      {compact ? null : <p className="px-3 pb-2 text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">{t("Menu")}</p>}
      {showHome ? <NavLink item={home} on={isOn(home)} compact={compact} onNavigate={onNavigate} /> : null}
      {visible.map((section) =>
        compact ? (
          <div key={section.title} className="flex flex-col gap-1 border-t border-border pt-1">
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} on={isOn(item)} compact onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div key={section.title} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => toggle(section)}
              aria-expanded={isOpen(section)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors hover:bg-muted",
                isOpen(section) ? "bg-muted/70 text-foreground" : "text-foreground/85"
              )}
            >
              <section.icon className="size-4 shrink-0" />
              <span className="flex-1 truncate text-start">{t(section.title)}</span>
              {isOpen(section) ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4 rtl:rotate-180" />}
            </button>
            {isOpen(section)
              ? section.items.map((item) => <NavLink key={item.href} item={item} on={isOn(item)} compact={false} sub onNavigate={onNavigate} />)
              : null}
          </div>
        )
      )}
    </nav>
  );
}

function SidebarBrand({ compact }: { compact: boolean }) {
  const t = useT();
  return (
    <LocaleLink href="/" aria-label="Ethio Computer" className={cn("flex items-center gap-3", compact && "justify-center")}>
      <Image src="/brand/logo-mark.svg" alt="" width={40} height={40} className="size-10 shrink-0" />
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-heading text-sm font-extrabold tracking-wide">ETHIO COMPUTER</span>
          <span className="truncate text-[0.65rem] font-semibold tracking-widest text-muted-foreground uppercase">{t("Admin portal")}</span>
        </span>
      )}
    </LocaleLink>
  );
}

function SidebarUser({ user, compact }: { user: User; compact: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "justify-center")} title={compact ? user.name : undefined}>
      <Avatar className="size-9 shrink-0">
        {user.image ? <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" /> : null}
        <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold uppercase">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
      )}
    </div>
  );
}

/**
 * የአድሚን ገጾች፦ በግራ በኩል በምድብ የተከፋፈለ ምናሌ (ሊጠብ ይችላል፤ ምርጫው በcookie ይታወሳል)፣ ከላይ የገጹ ስምና መንገዱ።
 * በስልክ ምናሌው ከላይ ባለው አዝራር ይከፈታል።
 */
export function AdminShell({
  initialCompact,
  only,
  user,
  actions,
  children,
}: {
  initialCompact: boolean;
  only?: string[];
  user: User;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useT();
  const [compact, setCompact] = useState(initialCompact);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { active } = useNavState(only);
  const title = t(active?.label ?? "Admin");
  const toggle = () => {
    const next = !compact;
    setCompact(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "compact" : "full"}; path=/; max-age=31536000; samesite=lax`;
  };
  const toggleLabel = compact ? t("Expand menu") : t("Collapse menu");

  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-sidebar transition-[width] duration-200 lg:flex",
          compact ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-20 items-center border-b border-border px-6">
          <SidebarBrand compact={compact} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute top-24 -end-3.5 z-10 size-7 rounded-full bg-sidebar text-muted-foreground"
        >
          {compact ? <ChevronRightIcon className="rtl:rotate-180" /> : <ChevronLeftIcon className="rtl:rotate-180" />}
        </Button>
        <div className={cn("flex-1 overflow-y-auto py-6 [scrollbar-width:thin]", compact ? "px-3" : "px-4")}>
          <SidebarNav only={only} compact={compact} />
        </div>
        <div className={cn("border-t border-border py-4", compact ? "px-3" : "px-6")}>
          <SidebarUser user={user} compact={compact} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:h-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label={t("Open menu")} className="lg:hidden" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
              <SheetTitle className="sr-only">{t("Menu")}</SheetTitle>
              <div className="flex h-16 items-center border-b border-border px-6">
                <SidebarBrand compact={false} />
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <SidebarNav only={only} compact={false} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-border px-6 py-4">
                <SidebarUser user={user} compact={false} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate font-heading text-lg font-bold">{title}</p>
            <p className="hidden truncate text-xs text-primary sm:block">
              {t("Admin")} / {title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 text-sm sm:p-6 [&_h1]:text-2xl [&_h2]:text-lg">{children}</main>
      </div>
    </div>
  );
}
