import { connection } from "next/server";
import { ArrowRightIcon, MegaphoneIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { CopyButton } from "@/components/telegram/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { getActiveBanners } from "@/lib/banners";
import { getLocale, getT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

/** በዋናው ገጽ ከላይ የሚታዩ ባነሮች፦ ርዕስና ጽሑፍ በተመልካቹ ቋንቋ (አማርኛ ከሌለ እንግሊዝኛው)፣ ሊንክ እና የሚኮፒ ቅናሽ ኮድ። */
export async function HomeBanners() {
  await connection();
  const [banners, locale, t] = await Promise.all([getActiveBanners(), getLocale(), getT()]);
  if (banners.length === 0) return null;
  const am = locale === "am";

  return (
    <div className="flex flex-col gap-4 pt-6">
      {banners.map((banner) => {
        const title = (am ? banner.titleAm : banner.titleEn) || banner.titleEn;
        const body = (am ? banner.textAm : banner.textEn) || banner.textEn;
        const label = (am ? banner.linkLabelAm : banner.linkLabelEn) || banner.linkLabelEn || t("Learn more");
        const external = banner.linkUrl?.startsWith("http");
        return (
          <aside
            key={banner.id}
            className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-linear-to-r from-primary to-gold-2 p-6 text-primary-foreground shadow-lg shadow-primary/20 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-4">
              <MegaphoneIcon className="mt-1 size-6 shrink-0" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-heading text-lg leading-snug font-bold text-balance">{title}</p>
                {body ? <p className="text-sm">{body}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {banner.code ? (
                <span className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 py-1 ps-3 pe-1 ring-1 ring-primary-foreground/25">
                  <span className="text-xs">{t("Code")}</span>
                  <span dir="ltr" className="font-mono font-bold tracking-wider">
                    {banner.code}
                  </span>
                  <CopyButton value={banner.code} label={t("Copy")} />
                </span>
              ) : null}
              {banner.linkUrl ? (
                external ? (
                  <a href={banner.linkUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), "bg-primary-foreground text-primary hover:bg-primary-foreground/90")}>
                    {label}
                    <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" />
                  </a>
                ) : (
                  <LocaleLink href={banner.linkUrl} className={cn(buttonVariants(), "bg-primary-foreground text-primary hover:bg-primary-foreground/90")}>
                    {label}
                    <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" />
                  </LocaleLink>
                )
              ) : null}
            </div>
          </aside>
        );
      })}
    </div>
  );
}
