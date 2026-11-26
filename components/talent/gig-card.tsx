import Image from "next/image";
import { BadgeCheckIcon, ClockIcon, MicIcon } from "lucide-react";
import { PlatformMark } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { Stars } from "@/components/talent/stars";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import { gigCategory } from "@/lib/talent-catalog";
import type { GigCard as GigCardData } from "@/lib/talent-queries";

export async function GigCard({ gig }: { gig: GigCardData }) {
  const t = await getT();
  const category = gigCategory(gig.category);
  return (
    <LocaleLink
      href={`/talent/${gig.id}`}
      className="group flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 transition-all hover:-translate-y-1 hover:ring-primary/60"
    >
      {gig.cover ? (
        <Image
          unoptimized
          src={`/api/talent-files/sample/${gig.cover.id}?size=thumb`}
          alt=""
          width={gig.cover.width ?? 640}
          height={gig.cover.height ?? 360}
          loading="lazy"
          className="aspect-video w-full rounded-xl bg-secondary object-cover"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-secondary">
          {gig.hasAudio ? <MicIcon className="size-10 text-primary" /> : <PlatformMark mark={category?.mark ?? ""} className="size-14" />}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {gig.official ? <Badge>{t("Official")}</Badge> : null}
        <Badge variant="outline">{t(category?.label ?? "Other")}</Badge>
        {gig.hasAudio ? (
          <Badge variant="secondary">
            <MicIcon data-icon="inline-start" />
            {t("Voice samples")}
          </Badge>
        ) : null}
      </div>
      <h3 className="line-clamp-2 font-semibold text-balance">{gig.title}</h3>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {gig.freelancerName}
        {gig.verified ? <BadgeCheckIcon aria-label={t("Verified")} className="size-4 text-primary" /> : null}
      </p>
      <div className="flex items-center gap-2 text-sm">
        {gig.rating ? (
          <>
            <Stars value={gig.rating.average} label={t("Rated {rating} out of 5", { rating: gig.rating.average.toFixed(1) })} />
            <span className="text-muted-foreground">({gig.rating.count})</span>
          </>
        ) : (
          <span className="text-muted-foreground">{t("New pro")}</span>
        )}
      </div>
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-4">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon className="size-4" />
          {t("{days} days", { days: gig.deliveryDays })}
        </span>
        <span className="text-right">
          <span className="block text-xs text-muted-foreground">{t("Starting at")}</span>
          <span className="font-heading text-xl font-bold text-primary">{formatPrice(t, gig.priceEtb)}</span>
        </span>
      </div>
    </LocaleLink>
  );
}
