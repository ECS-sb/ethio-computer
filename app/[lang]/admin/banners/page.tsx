import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteBannerAction, saveBannerAction, setBannerActiveAction } from "@/lib/banner-actions";
import { getAllBanners } from "@/lib/banners";
import { formatDateTime } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { requireAdmin } from "@/lib/session";

export const generateMetadata = pageTitle("Banners");

type Banner = Awaited<ReturnType<typeof getAllBanners>>[number];

/** datetime-local ሳጥን በአዲስ አበባ ሰዓት ይሞላል። */
function addisInput(date: Date | null) {
  return date ? new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";
}

function statusOf(banner: Banner, now: Date): { label: MessageKey; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (!banner.active) return { label: "Off", variant: "outline" };
  if (banner.endsAt && banner.endsAt <= now) return { label: "Ended", variant: "destructive" };
  if (banner.startsAt && banner.startsAt > now) return { label: "Scheduled", variant: "secondary" };
  return { label: "Showing now", variant: "default" };
}

async function BannerForm({ banner }: { banner?: Banner }) {
  const t = await getT();
  const key = banner?.id ?? "new";
  const field = (name: string) => `${name}-${key}`;
  return (
    <ActionForm action={saveBannerAction} className="flex flex-col gap-4">
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("titleEn")}>{t("Title in English")}</Label>
          <Input id={field("titleEn")} name="titleEn" required minLength={2} maxLength={140} defaultValue={banner?.titleEn} placeholder="ChatGPT Plus 20% off this week" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("titleAm")}>{t("Title in Amharic")}</Label>
          <Input id={field("titleAm")} name="titleAm" required minLength={2} maxLength={140} defaultValue={banner?.titleAm} placeholder="በዚህ ሳምንት ChatGPT Plus በ20% ቅናሽ" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("textEn")}>{t("Text in English (optional)")}</Label>
          <Input id={field("textEn")} name="textEn" maxLength={300} defaultValue={banner?.textEn} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("textAm")}>{t("Text in Amharic (optional)")}</Label>
          <Input id={field("textAm")} name="textAm" maxLength={300} defaultValue={banner?.textAm} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("linkUrl")}>{t("Link (optional)")}</Label>
          <Input id={field("linkUrl")} name="linkUrl" maxLength={500} dir="ltr" defaultValue={banner?.linkUrl ?? ""} placeholder="/subscriptions  or  https://…" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("code")}>{t("Discount code (optional)")}</Label>
          <Input id={field("code")} name="code" maxLength={40} dir="ltr" defaultValue={banner?.code ?? ""} placeholder="ETHIO20" className="font-mono" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("linkLabelEn")}>{t("Button text in English")}</Label>
          <Input id={field("linkLabelEn")} name="linkLabelEn" maxLength={40} defaultValue={banner?.linkLabelEn} placeholder="Buy now" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("linkLabelAm")}>{t("Button text in Amharic")}</Label>
          <Input id={field("linkLabelAm")} name="linkLabelAm" maxLength={40} defaultValue={banner?.linkLabelAm} placeholder="አሁኑኑ ይግዙ" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("startsAt")}>{t("Starts (optional, Addis Ababa time)")}</Label>
          <Input id={field("startsAt")} name="startsAt" type="datetime-local" defaultValue={addisInput(banner?.startsAt ?? null)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={field("endsAt")}>{t("Ends (optional, Addis Ababa time)")}</Label>
          <Input id={field("endsAt")} name="endsAt" type="datetime-local" defaultValue={addisInput(banner?.endsAt ?? null)} />
        </div>
      </div>
      <SubmitButton className="w-fit">{banner ? t("Save") : t("Publish banner")}</SubmitButton>
    </ActionForm>
  );
}

export default async function AdminBannersPage() {
  const t = await getT();
  await requireAdmin();
  const banners = await getAllBanners();
  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Banners")}</h1>
        <p className="text-sm text-muted-foreground">{t("Banners show at the top of the home page in the visitor's language. Add a link, a discount code people can copy, and dates so it starts and ends by itself.")}</p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        <h2 className="text-xl font-semibold">{t("New banner")}</h2>
        <BannerForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("All banners")}</h2>
        {banners.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No banners yet.")}</p>
        ) : (
          banners.map((banner) => {
            const status = statusOf(banner, now);
            return (
              <article key={banner.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.variant}>{t(status.label)}</Badge>
                      {banner.code ? (
                        <span dir="ltr" className="font-mono text-sm text-primary">
                          {banner.code}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold">{banner.titleEn}</p>
                    <p className="text-sm text-muted-foreground">{banner.titleAm}</p>
                    <p className="text-xs text-muted-foreground">
                      {banner.startsAt ? formatDateTime(banner.startsAt) : t("Now")} → {banner.endsAt ? formatDateTime(banner.endsAt) : t("No end")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={setBannerActiveAction} id={banner.id} fields={{ active: banner.active ? "false" : "true" }} variant="outline" size="sm">
                      {banner.active ? t("Turn off") : t("Turn on")}
                    </ActionButton>
                    <ActionButton action={deleteBannerAction} id={banner.id} variant="ghost" size="sm" className="text-destructive">
                      {t("Delete")}
                    </ActionButton>
                  </div>
                </div>
                <details className="rounded-xl bg-muted/40 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">{t("Edit")}</summary>
                  <div className="pt-4">
                    <BannerForm banner={banner} />
                  </div>
                </details>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
