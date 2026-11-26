"use client";

import { MessageCircleIcon, ShoppingCartIcon } from "lucide-react";
import { SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { RedirectForm } from "@/components/talent/redirect-form";
import { buyProductAction, startProductThreadAction } from "@/lib/electronics-actions";

export function AskSellerButton({ productId }: { productId: string }) {
  const t = useT();
  return (
    <RedirectForm action={startProductThreadAction} to="/dashboard/electronics/deals/{id}">
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton variant="outline" size="lg" className="w-full">
        <MessageCircleIcon data-icon="inline-start" />
        {t("Ask the seller")}
      </SubmitButton>
    </RedirectForm>
  );
}

/** በተለጠፈው ዋጋ ከዋሌቱ ይከፍላል፤ ብሩ ገዢው እቃውን እስኪቀበል በድርጅቱ ይያዛል። */
export function BuyButton({ productId, label }: { productId: string; label: string }) {
  return (
    <RedirectForm action={buyProductAction} to="/dashboard/electronics/deals/{id}">
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton size="lg" className="w-full">
        <ShoppingCartIcon data-icon="inline-start" />
        {label}
      </SubmitButton>
    </RedirectForm>
  );
}
