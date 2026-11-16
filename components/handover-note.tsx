import { HandshakeIcon, UserCheckIcon } from "lucide-react";
import { formatPrice, handoverOptions, type HandoverValue, type OrderStatusValue } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { feeFor } from "@/lib/fees";

/** ትዕዛዙ እንዴት እንደሚጠናቀቅ (በራሳቸው 10% ወይም በኤጀንት 15%) እና ለዚህ ሰው ቀጣዩ እርምጃ። */
export async function HandoverNote({
  handover,
  role,
  status,
  amountEtb,
  feePercent,
}: {
  handover: HandoverValue;
  role: "buyer" | "seller";
  status: OrderStatusValue;
  amountEtb?: number;
  feePercent?: number;
}) {
  const t = await getT();
  const option = handoverOptions.find((item) => item.value === handover) ?? handoverOptions[0];
  const Icon = handover === "AGENT" ? UserCheckIcon : HandshakeIcon;

  let next: MessageKey | null = null;
  if (status === "PAID") {
    if (handover === "AGENT") next = role === "seller" ? "Our agent will contact you to receive the account. Don't give it to the buyer directly." : "Our agent is receiving the account from the seller. You'll get it from the agent.";
    else next = role === "seller" ? "Payment is held. Transfer the account to the buyer, then press \"I transferred the account\"." : "Payment is held. The seller will now transfer the account to you.";
  }

  const fee = role === "seller" && amountEtb !== undefined ? feeFor(amountEtb, feePercent ?? option.feePercent) : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-secondary/60 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" />
        {t(option.label)}
        <span className="font-normal text-muted-foreground">· {t("{percent}% fee, paid by the seller", { percent: feePercent ?? option.feePercent })}</span>
      </p>
      {fee ? (
        <p className="text-muted-foreground">
          {t("You receive {payout} after the {fee} fee.", { payout: formatPrice(t, fee.payoutEtb), fee: formatPrice(t, fee.feeEtb) })}
        </p>
      ) : null}
      {next ? <p>{t(next)}</p> : null}
    </div>
  );
}
