"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { LocaleLink, useLocale, useT } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/catalog";
import type { SubscriptionInfo } from "@/lib/generated/prisma/enums";
import { localePath } from "@/lib/i18n";
import { orderSubscriptionAction } from "@/lib/subscription-actions";
import { infoFields } from "@/lib/subscription-catalog";
import { cn } from "@/lib/utils";

type Plan = { id: string; label: string; price: number; before: number | null; instant: boolean };

/** እቅድ መምረጫ፣ የአካውንቱ መረጃ እና ሁለቱ የክፍያ መንገዶች (ዋሌት ወይም ቻፓ)። */
export function SubscriptionOrderForm({
  plans,
  requiredInfo,
  balance,
  chapa,
  signedIn,
  loginHref,
}: {
  plans: Plan[];
  requiredInfo: SubscriptionInfo;
  balance: number;
  chapa: boolean;
  signedIn: boolean;
  loginHref: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const plan = plans.find((option) => option.id === planId) ?? plans[0];
  const info = infoFields[requiredInfo];
  const enough = balance >= (plan?.price ?? 0);

  const pay = (form: HTMLFormElement, method: "wallet" | "chapa") => {
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    data.set("method", method);
    startTransition(async () => {
      const result = await orderSubscriptionAction(data);
      if (!result.ok) {
        toast.error(t(result.message));
        return;
      }
      if (result.code?.startsWith("https://")) {
        window.location.href = result.code;
        return;
      }
      toast.success(t(result.message));
      if (result.id) router.push(localePath(locale, `/dashboard/subscriptions/${result.id}`));
    });
  };

  return (
    <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm font-medium">{t("Choose a plan")}</legend>
        {plans.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 transition-colors",
              option.id === planId ? "bg-primary/10 ring-primary" : "ring-foreground/15 hover:ring-primary/60"
            )}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name="planId" value={option.id} checked={option.id === planId} onChange={() => setPlanId(option.id)} className="accent-primary" />
              <span className="font-medium">{option.label}</span>
              {option.instant ? <span className="rounded-full bg-primary/15 px-2 text-xs text-primary">{t("Instant")}</span> : null}
            </span>
            <span className="text-right">
              {option.before ? <span className="block text-xs text-muted-foreground line-through">{formatPrice(t, option.before)}</span> : null}
              <span className="font-heading font-bold text-primary">{formatPrice(t, option.price)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {info ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="subscription-account">{t(info.label)}</Label>
          <Input id="subscription-account" name="accountInfo" type={info.type} required maxLength={120} placeholder={info.placeholder} dir="ltr" autoComplete="off" />
          <p className="text-xs text-muted-foreground">{t("We activate the subscription on this account. Never send us your password.")}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("We'll send you the code or login details here after we buy it.")}</p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="subscription-note">{t("Note (optional)")}</Label>
        <Textarea id="subscription-note" name="note" maxLength={500} rows={2} placeholder={t("Anything we should know, like the country of your account.")} />
      </div>

      {signedIn ? (
        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <Button type="button" size="lg" disabled={pending || !enough} onClick={(event) => pay(event.currentTarget.form!, "wallet")}>
            <WalletIcon data-icon="inline-start" />
            {t("Pay {amount} from wallet", { amount: formatPrice(t, plan?.price ?? 0) })}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("Wallet balance: {amount}", { amount: formatPrice(t, balance) })}
            {!enough ? ` · ${t("Not enough balance.")}` : ""}
          </p>
          {chapa ? (
            <Button type="button" size="lg" variant="outline" disabled={pending} onClick={(event) => pay(event.currentTarget.form!, "chapa")}>
              <CreditCardIcon data-icon="inline-start" />
              {t("Pay with Chapa (Telebirr, CBE Birr, bank)")}
            </Button>
          ) : null}
        </div>
      ) : (
        <LocaleLink href={loginHref} className={buttonVariants({ size: "lg" })}>
          {t("Sign in to buy")}
        </LocaleLink>
      )}
    </form>
  );
}
