"use client";

import { CreditCardIcon, RefreshCwIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { checkChapaAction, retryChapaAction } from "@/lib/subscription-actions";

/** ያልተከፈለ የቻፓ ትዕዛዝ፦ ክፍያውን እንደገና መፈተሽ ወይም ወደ ቻፓ ገጹ መመለስ። */
export function ChapaButtons({ orderId }: { orderId: string }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      <ActionForm
        action={retryChapaAction}
        onSuccess={(result) => {
          if (result.code?.startsWith("https://")) window.location.href = result.code;
        }}
      >
        <input type="hidden" name="id" value={orderId} />
        <SubmitButton>
          <CreditCardIcon data-icon="inline-start" />
          {t("Pay with Chapa")}
        </SubmitButton>
      </ActionForm>
      <ActionForm action={checkChapaAction}>
        <input type="hidden" name="id" value={orderId} />
        <SubmitButton variant="outline">
          <RefreshCwIcon data-icon="inline-start" />
          {t("I already paid, check again")}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
