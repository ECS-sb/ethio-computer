"use client";

import { SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { SelectInput } from "@/components/select-input";
import { RedirectForm } from "@/components/talent/redirect-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGigAction } from "@/lib/talent-actions";
import { AUDIO_TYPES, gigCategories, MAX_GIG_AUDIO, MAX_GIG_IMAGES, MAX_PORTFOLIO_LINKS, TALENT_FEE_PERCENT } from "@/lib/talent-catalog";

/** አዲስ አገልግሎት፦ ምድብ፣ ርዕስ፣ መግለጫ፣ ዋጋ፣ የማስረከቢያ ቀናት እና ፖርትፎሊዮ (ምስል፣ ድምፅ፣ ሊንክ)። አድሚኑ ካጸደቀው በኋላ ይታያል። */
export function GigForm() {
  const t = useT();
  return (
    <RedirectForm action={createGigAction} to="/talent/{id}" className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gig-category">{t("Category")}</Label>
        <SelectInput id="gig-category" name="category" options={gigCategories} placeholder={t("Choose a category")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="gig-title">{t("Title")}</Label>
        <Input id="gig-title" name="title" required minLength={8} maxLength={90} placeholder={t("For example: Professional Amharic voice-over for ads and YouTube")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="gig-description">{t("Description")}</Label>
        <Textarea
          id="gig-description"
          name="description"
          required
          minLength={30}
          maxLength={3000}
          rows={6}
          placeholder={t("What you do, what the client gets, how many changes are included, and what you need from the client.")}
        />
        <p className="text-xs text-muted-foreground">{t("Don't add phone numbers, usernames or links here. Clients contact you through the site chat.")}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gig-price">{t("Starting price (ETB)")}</Label>
          <Input id="gig-price" name="priceEtb" type="number" inputMode="numeric" required min={100} max={1_000_000} />
          <p className="text-xs text-muted-foreground">{t("Ethio Computer keeps {percent}% when a job is completed.", { percent: TALENT_FEE_PERCENT })}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gig-days">{t("Delivery time (days)")}</Label>
          <Input id="gig-days" name="deliveryDays" type="number" inputMode="numeric" required min={1} max={60} defaultValue={3} />
        </div>
      </div>
      <fieldset className="flex flex-col gap-4 border-t border-border pt-6">
        <legend className="pb-2 font-semibold">{t("Portfolio")}</legend>
        <p className="text-sm text-muted-foreground">{t("Add at least one sample. Clients decide by looking at your past work.")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gig-images">{t("Images (up to {count}, 1MB each)", { count: MAX_GIG_IMAGES })}</Label>
          <Input id="gig-images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          <p className="text-xs text-muted-foreground">{t("For thumbnails: your best designs. For editors: screenshots of your work.")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gig-audios">{t("Voice samples (up to {count}, 1.5MB each)", { count: MAX_GIG_AUDIO })}</Label>
          <Input id="gig-audios" name="audios" type="file" accept={AUDIO_TYPES.join(",")} multiple />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gig-links">{t("Video links (up to {count})", { count: MAX_PORTFOLIO_LINKS })}</Label>
          <Textarea id="gig-links" name="portfolioLinks" rows={3} dir="ltr" placeholder="https://youtu.be/…" />
          <p className="text-xs text-muted-foreground">{t("YouTube or Google Drive links only, one per line. An admin checks them before your service goes live.")}</p>
        </div>
      </fieldset>
      <SubmitButton size="lg" className="w-fit">
        {t("Send for review")}
      </SubmitButton>
    </RedirectForm>
  );
}
