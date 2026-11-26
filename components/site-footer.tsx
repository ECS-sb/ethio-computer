import { GlobeIcon, PhoneIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { PlatformLogo } from "@/components/platform-logo";
import { contact, getPlatform, platforms, schoolSocials } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";

export async function SiteFooter() {
  const t = await getT();
  const groups = [
    {
      title: t("Market"),
      links: [
        ...platforms.map((platform) => ({ href: `/accounts?platform=${platform.id}`, label: platform.name })),
        { href: "/accounts?special=1", label: t("Special usernames") },
        { href: "/sold", label: t("Sold") },
        { href: "/talent", label: t("Hire talent") },
      ],
    },
    {
      title: t("Help"),
      links: [
        { href: "/how-it-works", label: t("How it works") },
        { href: "/faq", label: t("FAQ") },
        { href: "/sell", label: t("Sell an account") },
        { href: "/electronics", label: t("Electronics") },
        { href: "/contact", label: t("Contact us") },
      ],
    },
    {
      title: t("Company"),
      links: [
        { href: "/about", label: t("About us") },
        { href: "/rules", label: t("Buyer and seller rules") },
        { href: "/terms", label: t("Terms of service") },
        { href: "/privacy", label: t("Privacy policy") },
      ],
    },
  ];

  const socials = schoolSocials.filter((social) => social.url);
  const socialButton =
    "group flex items-center gap-4 rounded-xl bg-background/40 p-4 ring-1 ring-foreground/10 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-background/60 hover:ring-primary/50";
  const socialIcon = "flex size-10 shrink-0 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 transition-colors group-hover:ring-primary/40";

  return (
    <footer className="mt-24 border-t border-border">
      {/* የEthio Computer School ሶሻል ሚዲያዎች */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6">
        <section className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-card/50 p-6 ring-1 ring-foreground/10 backdrop-blur-xl sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-primary/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-x-12 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
          <div className="relative flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-bold tracking-tight">{t("Follow Ethio Computer School")}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">{t("A marketplace to buy and sell social media accounts in Ethiopia.")}</p>
          </div>
          <div className="relative grid gap-2 sm:grid-cols-2 lg:min-w-[36rem]">
            {socials.map((social) => (
              <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className={socialButton}>
                <span className={socialIcon}>
                  <PlatformLogo id={social.platform} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted-foreground">{getPlatform(social.platform)?.name}</span>
                  <span className="truncate text-sm font-semibold" dir="ltr">
                    {social.handle}
                  </span>
                </span>
              </a>
            ))}
            <a href="https://ethiocomputer.school" target="_blank" rel="noopener noreferrer" className={socialButton}>
              <span className={socialIcon}>
                <GlobeIcon className="size-5 text-primary" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-muted-foreground">{t("Website")}</span>
                <span className="truncate text-sm font-semibold" dir="ltr">
                  ethiocomputer.school
                </span>
              </span>
            </a>
            <a href={contact.phoneUrl} className={socialButton}>
              <span className={socialIcon}>
                <PhoneIcon className="size-5 text-primary" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-muted-foreground">{t("Phone")}</span>
                <span className="truncate text-sm font-semibold" dir="ltr">
                  {contact.phone}
                </span>
              </span>
            </a>
          </div>
        </section>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Brand />
          <p className="text-sm text-muted-foreground">{t("A marketplace to buy and sell social media accounts in Ethiopia.")}</p>
          <div className="flex flex-col gap-2 text-sm">
            <a href="https://ethiocomputer.school" className="w-fit text-muted-foreground transition-colors hover:text-primary">
              Ethio Computer School
            </a>
            <a href="https://ethiocshub.com" className="w-fit text-muted-foreground transition-colors hover:text-primary">
              Ethio CS Hub
            </a>
          </div>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{group.title}</p>
            {group.links.map((link) => (
              <LocaleLink
                key={link.href}
                href={link.href}
                className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </LocaleLink>
            ))}
          </nav>
        ))}
      </div>
      <div className="mx-auto w-full max-w-7xl border-t border-border px-6 py-6">
        <p className="text-xs text-muted-foreground">© Ethio Computer</p>
      </div>
    </footer>
  );
}
