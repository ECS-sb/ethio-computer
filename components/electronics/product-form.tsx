"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useT } from "@/components/i18n-provider";
import { ScreenshotPicker } from "@/components/screenshot-picker";
import { SelectInput } from "@/components/select-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction } from "@/lib/electronics-actions";
import { ELECTRONICS_FEE_PERCENT, productCategories, productCities, productConditions } from "@/lib/electronics-catalog";
import { localePath } from "@/lib/i18n";

/** አዲስ እቃ፦ ምድብ፣ ሁኔታ፣ ርዕስ፣ ብራንድ፣ መግለጫ፣ ዋጋ፣ ከተማ እና 1-4 ፎቶ (በስልኩ ላይ ተቀንሰው ይላካሉ)። official፦ አድሚኑ ሲለጥፍ። */
export function ProductForm({ official = false }: { official?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (photos.length === 0) {
      toast.error(t("Add 1 to 4 photos of the item."));
      return;
    }
    const data = new FormData(event.currentTarget);
    for (const photo of photos) data.append("screenshots", photo);
    startTransition(async () => {
      const result = await createProductAction(data);
      if (!result.ok) {
        toast.error(t(result.message));
        return;
      }
      toast.success(t(result.message));
      if (result.id) router.push(localePath(locale, `/electronics/${result.id}`));
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-category">{t("Category")}</Label>
          <SelectInput id="product-category" name="category" options={productCategories} placeholder={t("Choose a category")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-condition">{t("Condition")}</Label>
          <SelectInput id="product-condition" name="condition" options={productConditions} defaultValue="USED" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-title">{t("Title")}</Label>
        <Input id="product-title" name="title" required minLength={5} maxLength={90} placeholder={t("For example: iPhone 13 Pro, 256GB, blue")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-brand">{t("Brand (optional)")}</Label>
        <Input id="product-brand" name="brand" maxLength={40} placeholder="Apple, Samsung, HP…" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-description">{t("Description")}</Label>
        <Textarea
          id="product-description"
          name="description"
          required
          minLength={20}
          maxLength={3000}
          rows={6}
          placeholder={t("Storage, RAM, battery health, any scratches or repairs, what comes in the box, and why you're selling.")}
        />
        <p className="text-xs text-muted-foreground">{t("Don't add phone numbers, usernames or links here. Buyers contact you through the site chat.")}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-price">{t("Price (ETB)")}</Label>
          <Input id="product-price" name="priceEtb" type="number" inputMode="numeric" required min={50} max={5_000_000} />
          {official ? null : <p className="text-xs text-muted-foreground">{t("Ethio Computer keeps {percent}% when a sale is completed.", { percent: ELECTRONICS_FEE_PERCENT })}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-city">{t("City")}</Label>
          <SelectInput id="product-city" name="city" options={productCities} defaultValue="Addis Ababa" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className="font-semibold">{t("Photos")}</p>
        <p className="text-sm text-muted-foreground">{t("Add 1 to 4 clear photos of the real item: front, back, and any damage.")}</p>
        <ScreenshotPicker files={photos} onChange={setPhotos} />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-fit">
        {official ? t("Publish now") : t("Send for review")}
      </Button>
    </form>
  );
}
