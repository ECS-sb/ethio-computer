import { BadgeCheckIcon, ClockIcon, RocketIcon, ShieldCheckIcon, TrendingUpIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ImageUploadField } from "@/components/image-upload-field";
import { SelectInput } from "@/components/select-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitVerificationAction } from "@/lib/actions";
import { banks, idTypes } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { getVerification } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("Seller verification");

const benefits: { icon: typeof RocketIcon; title: MessageKey; description: MessageKey }[] = [
  { icon: RocketIcon, title: "Sell faster", description: "Your listings appear first in the market." },
  { icon: BadgeCheckIcon, title: "A trusted badge", description: "Buyers see the verified badge on your listings and profile." },
  { icon: TrendingUpIcon, title: "Withdraw your money", description: "Money from sales goes to your bank account in your verified name." },
];

export default async function VerificationPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/verification");
  const { verifiedSeller, verification } = await getVerification(user.id);
  const showForm = !verifiedSeller && verification?.status !== "PENDING";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Seller verification")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("Verified sellers sell faster. Buyers trust the badge, and your listings appear first in the market.")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
            <benefit.icon className="size-6 text-primary" />
            <h2 className="font-semibold">{t(benefit.title)}</h2>
            <p className="text-sm text-muted-foreground">{t(benefit.description)}</p>
          </div>
        ))}
      </div>

      {verifiedSeller ? (
        <p className="flex items-center gap-2 rounded-xl bg-primary/15 p-6 font-semibold ring-1 ring-primary/30">
          <BadgeCheckIcon className="size-6 text-primary" />
          {t("Your account is verified.")}
        </p>
      ) : verification?.status === "PENDING" ? (
        <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-6 ring-1 ring-foreground/10">
          <ClockIcon className="size-5 text-primary" />
          {t("Your documents are being reviewed. This usually takes less than a day.")}
        </p>
      ) : null}

      {verification?.status === "REJECTED" ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm ring-1 ring-destructive/40">
          {t("Your last request was rejected.")} {verification.rejectReason}
        </p>
      ) : null}

      {showForm ? (
        <ActionForm action={submitVerificationAction} className="flex max-w-3xl flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            {t("The name on your ID and on your bank account must be the same. Only admins see these details; they are never shown to buyers.")}
          </p>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="pb-2 font-semibold">{t("1. You")}</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">{t("Full name, as on your ID")}</Label>
              <Input id="fullName" name="fullName" required minLength={3} maxLength={120} defaultValue={verification?.fullName ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">{t("Phone")}</Label>
              <Input id="phone" name="phone" type="tel" required placeholder="09…" defaultValue={verification?.phone ?? user.phone ?? ""} dir="ltr" autoComplete="tel" />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="pb-2 font-semibold">{t("2. ID")}</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idType">{t("ID type")}</Label>
              <SelectInput id="idType" name="idType" options={idTypes} defaultValue={verification?.idType ?? "FAYDA"} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idNumber">{t("ID number")}</Label>
              <Input id="idNumber" name="idNumber" required minLength={4} maxLength={40} defaultValue={verification?.idNumber ?? ""} dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <ImageUploadField name="idImage" label={t("Upload a photo of your ID")} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="pb-2 font-semibold">{t("3. Bank account")}</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bankName">{t("Bank")}</Label>
              <SelectInput id="bankName" name="bankName" options={banks} defaultValue={verification?.bankName ?? "cbe"} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bankAccountNumber">{t("Account number")}</Label>
              <Input id="bankAccountNumber" name="bankAccountNumber" required inputMode="numeric" defaultValue={verification?.bankAccountNumber ?? ""} dir="ltr" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="bankAccountName">{t("Account holder's name")}</Label>
              <Input id="bankAccountName" name="bankAccountName" required minLength={3} maxLength={120} defaultValue={verification?.bankAccountName ?? ""} />
            </div>
          </fieldset>

          <SubmitButton className="w-fit">{t("Send for verification")}</SubmitButton>
        </ActionForm>
      ) : null}
    </>
  );
}
