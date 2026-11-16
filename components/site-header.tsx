"use client";

import { useState } from "react";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { MenuIcon, SearchIcon } from "lucide-react";
import { useCompare } from "@/components/compare-store";
import { LocaleLink, useLocale, useT } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
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

const links: { href: string; label: MessageKey }[] = [
  { href: "/accounts", label: "Market" },
  { href: "/sell", label: "Sell" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/sellers", label: "Sellers" },
  { href: "/faq", label: "FAQ" },
];

const mobileExtras: { href: string; label: MessageKey }[] = [
  { href: "/compare", label: "Compare" },
  { href: "/dashboard", label: "Dashboard" },
];

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
  const { ids } = useCompare();
  const t = useT();
  const locale = useLocale();
  const searchAction = localePath(locale, "/accounts");
  const pathname = stripLocale(usePathname());

  return (
    // ተንሳፋፊ የመስታወት header፦ ብራንድ በግራ፣ ምናሌው በመሃል፣ ቁልፎቹ በቀኝ።
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-6 sm:pt-4">
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 rounded-full bg-card/55 py-2 pr-2 pl-3 shadow-2xl shadow-black/40 ring-1 ring-foreground/10 backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-12 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-primary/50 before:to-transparent sm:gap-4 sm:pl-4">
        {brand}

        <nav aria-label={t("Main")} className="hidden items-center gap-1 justify-self-center rounded-full bg-background/50 p-1 ring-1 ring-foreground/10 lg:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
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
          })}
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
          {languageSlot}
          <LocaleLink href="/compare" className={cn(buttonVariants({ variant: "ghost" }), "hidden rounded-full xl:inline-flex")}>
            {t("Compare")}
            {ids.length > 0 ? <Badge>{ids.length}</Badge> : null}
          </LocaleLink>
          {authSlot}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label={t("Open menu")} className="size-10 rounded-full lg:hidden" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{t("Menu")}</SheetTitle>
              </SheetHeader>
              <nav aria-label={t("Mobile")} className="flex flex-col gap-2 px-4 pb-6">
                <Form action={searchAction} role="search" className="pb-2" onSubmit={() => setOpen(false)}>
                  <Input name="q" aria-label={t("Search accounts")} placeholder={t("Search accounts…")} />
                </Form>
                {[...links, ...mobileExtras].map((link) => (
                  <LocaleLink
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    {t(link.label)}
                  </LocaleLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
