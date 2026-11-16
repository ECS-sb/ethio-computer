import { connection } from "next/server";
import { ArrowRightIcon, BadgeCheckIcon, ClockIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/lib/i18n-server";
import { getVerification } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

/** ላልተረጋገጡ ሻጮች፦ "ያረጋግጡ፣ ቶሎ ይሸጣሉ"። ለተረጋገጡና ላልገቡ ተጠቃሚዎች ምንም አያሳይም። */
export async function VerifyPromo() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.suspended) return null;
  const t = await getT();
  const { verifiedSeller, verification } = await getVerification(user.id);
  if (verifiedSeller) return null;

  if (verification?.status === "PENDING") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-4 text-sm ring-1 ring-foreground/10">
        <ClockIcon className="size-4 shrink-0 text-primary" />
        {t("Your verification is being reviewed. Your badge appears when it's approved.")}
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-linear-to-br from-primary to-gold-2 p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <BadgeCheckIcon className="size-8 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-heading text-lg font-bold">{t("Verified sellers sell faster")}</p>
          <p className="text-sm">{t("Verify with your phone, Fayda ID or passport, and a bank account in the same name. You get a badge and your listings appear first.")}</p>
        </div>
      </div>
      <LocaleLink
        href="/dashboard/verification"
        className={buttonVariants({ className: "relative shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90" })}
      >
        {t("Verify my account")}
        <ArrowRightIcon data-icon="inline-end" />
      </LocaleLink>
    </div>
  );
}
