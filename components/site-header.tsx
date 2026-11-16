"use client";

import { Suspense, useState } from "react";
import Form from "next/form";
import { usePathname } from "next/navigation";
import {
  ArrowRightIcon,
  CircleHelpIcon,
  LayoutDashboardIcon,
  MenuIcon,
  RouteIcon,
  SearchIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { LocaleLink, useLocale, useT } from "@/components/i18n-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { localePath, stripLocale, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: MessageKey; icon: LucideIcon };

const links: NavLink[] = [
  { href: "/accounts", label: "Market", icon: StoreIcon },
  { href: "/sell", label: "Sell", icon: TagIcon },
  { href: "/how-it-works", label: "How it works", icon: RouteIcon },
  { href: "/sellers", label: "Sellers", icon: UsersIcon },
  { href: "/faq", label: "FAQ", icon: CircleHelpIcon },
];

const mobileExtras: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function DesktopLinks({ pathname }: { pathname: string }) {
  const t = useT();
  return links.map((link) => {
    const active = isActive(pathname, link.href);
    return (
      <LocaleLink
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition-colors",
          active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        )}
      >
        {t(link.label)}
      </LocaleLink>
    );
  });
}

function ActiveDesktopLinks() {
  return <DesktopLinks pathname={stripLocale(usePathname())} />;
}

type MobileLinksProps = { pathname: string; onNavigate: () => void };

function MobileLinks({ pathname, onNavigate }: MobileLinksProps) {
  const t = useT();
  return [...links, ...mobileExtras].map((link) => {
    const active = isActive(pathname, link.href);
    return (
      <LocaleLink
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
          active ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "hover:bg-foreground/10"
        )}
      >
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl ring-1 transition-colors",
            active ? "bg-primary text-primary-foreground ring-primary" : "bg-background/40 text-muted-foreground ring-foreground/10 group-hover:text-foreground"
          )}
        >
          <link.icon className="size-4" />
        </span>
        {t(link.label)}
      </LocaleLink>
    );
  });
}

function ActiveMobileLinks(props: Omit<MobileLinksProps, "pathname">) {
  return <MobileLinks pathname={stripLocale(usePathname())} {...props} />;
}

export function SiteHeader({
  brand,
  languageSlot,
  authSlot,
}: {
  brand: React.ReactNode;
  languageSlot: React.ReactNode;
  authSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const locale = useLocale();
  const searchAction = localePath(locale, "/accounts");

  return (
    // ተንሳፋፊ የመስታወት header፦ ብራንድ በግራ፣ ምናሌው በመሃል፣ ቁልፎቹ በቀኝ።
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-6 sm:pt-4">
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 rounded-full bg-card/55 py-2 pr-2 pl-3 shadow-2xl shadow-black/40 ring-1 ring-foreground/10 backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-primary/50 before:to-transparent sm:gap-4 sm:pl-4">
        {brand}

        <nav aria-label={t("Main")} className="hidden items-center gap-1 justify-self-center rounded-full bg-background/50 p-1 ring-1 ring-foreground/10 lg:flex">
          <Suspense fallback={<DesktopLinks pathname="" />}>
            <ActiveDesktopLinks />
          </Suspense>
        </nav>

        <div className="col-start-3 flex items-center gap-2">
          <LocaleLink
            href="/accounts"
            aria-label={t("Search accounts")}
            title={t("Search accounts")}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden size-10 rounded-full sm:inline-flex")}
          >
            <SearchIcon />
          </LocaleLink>
          <ThemeToggle className="hidden sm:inline-flex" />
          {languageSlot}
          {authSlot}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label={t("Open menu")} className="size-10 rounded-full lg:hidden" />}>
              <MenuIcon />
            </SheetTrigger>
            {/* ተንሳፋፊ የመስታወት ምናሌ፦ ከጀርባው ያለው ገጽ በብዥታ ይታያል፣ ወርቃማ ብርሃን አለው። */}
            <SheetContent
              side="right"
              className="data-[side=right]:inset-y-2! data-[side=right]:right-2! data-[side=right]:h-auto! data-[side=right]:w-[calc(100%-1rem)]! overflow-hidden rounded-xl border-0! bg-card/45 shadow-2xl shadow-black/60 ring-1 ring-foreground/15 backdrop-blur-2xl backdrop-saturate-150 sm:max-w-sm"
            >
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-primary/25 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-gold-2/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

              <SheetHeader className="relative">
                <SheetTitle className="font-heading text-lg">{t("Menu")}</SheetTitle>
              </SheetHeader>
              <nav aria-label={t("Mobile")} className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
                <Form action={searchAction} role="search" className="relative pb-4" onSubmit={() => setOpen(false)}>
                  <SearchIcon className="pointer-events-none absolute top-[calc(50%-0.5rem)] left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="q"
                    aria-label={t("Search accounts")}
                    placeholder={t("Search accounts…")}
                    className="h-12 rounded-full bg-background/40 pl-11 ring-1 ring-foreground/10 backdrop-blur-sm"
                  />
                </Form>
                <Suspense fallback={<MobileLinks pathname="" onNavigate={() => setOpen(false)} />}>
                  <ActiveMobileLinks onNavigate={() => setOpen(false)} />
                </Suspense>
              </nav>
              <div className="relative flex flex-col gap-2 border-t border-foreground/10 p-4">
                <ThemeToggle withLabel className="w-full bg-background/40 sm:hidden" />
                <LocaleLink
                  href="/sell"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full bg-linear-to-r from-primary to-gold-2 shadow-lg shadow-primary/25")}
                >
                  {t("Sell an account")}
                  <ArrowRightIcon data-icon="inline-end" />
                </LocaleLink>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
