"use client";

import { SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { RedirectForm } from "@/components/talent/redirect-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hireGigAction } from "@/lib/talent-actions";

/** መቅጠሪያ፦ ዋጋ (ከመነሻው በታች አይሆንም) እና የስራው ዝርዝር። ብሩ ወዲያውኑ ከዋሌቱ ተይዞ ይቆያል። */
export function HireForm({ gigId, minPrice }: { gigId: string; minPrice: number }) {
  const t = useT();
  return (
    <RedirectForm action={hireGigAction} to="/dashboard/jobs/{id}" className="flex flex-col gap-4">
      <input type="hidden" name="gigId" value={gigId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="hire-amount">{t("Amount (ETB)")}</Label>
        <Input id="hire-amount" name="amountEtb" type="number" inputMode="numeric" min={minPrice} defaultValue={minPrice} required />
        <p className="text-xs text-muted-foreground">{t("Agree on the price in the chat first if the job is bigger.")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="hire-brief">{t("What do you need?")}</Label>
        <Textarea
          id="hire-brief"
          name="brief"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
          placeholder={t("For example: a 2-minute Amharic voice-over for a product video, calm male voice.")}
        />
      </div>
      <SubmitButton size="lg">{t("Hire and pay from wallet")}</SubmitButton>
    </RedirectForm>
  );
}
