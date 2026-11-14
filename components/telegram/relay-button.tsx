"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CornerUpRightIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { relayTelegramMessageAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

export type RelayTarget = { chatId: string; name: string; side: "buyer" | "seller"; paid: boolean };

/**
 * "ለገዢው ላክ"፦ ከሻጩ የመጣውን ኢሜይል፣ ፓስዎርድ ወይም ኮድ (ወይም የኮዱን ፎቶ) በድርጅቱ በኩል ለገዢው ይልካል (በተቃራኒውም)።
 * ገዢው ገና እንደከፈለ ካልተመዘገበ መጀመሪያ ማረጋገጫ ይጠይቃል (ሁለተኛ ጊዜ ሲነካ ይልካል)።
 */
export function RelayButtons({ messageId, targets }: { messageId: string; targets: RelayTarget[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {targets.map((target) => (
        <RelayButton key={target.chatId} messageId={messageId} target={target} />
      ))}
    </span>
  );
}

function RelayButton({ messageId, target }: { messageId: string; target: RelayTarget }) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const needsConfirm = target.side === "buyer" && !target.paid;

  const relay = () => {
    if (needsConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const data = new FormData();
      data.set("id", messageId);
      data.set("to", target.chatId);
      const result = await relayTelegramMessageAction(data);
      setConfirming(false);
      if (result.ok) {
        setSent(true);
        toast.success(t("Sent to {name}.", { name: target.name }));
        router.refresh();
      } else {
        toast.error(t(result.message));
      }
    });
  };

  const label = sent
    ? t("Sent to {name}", { name: target.name })
    : confirming
      ? t("Buyer not marked as paid. Click again to send.")
      : target.side === "buyer"
        ? t("Send to buyer ({name})", { name: target.name })
        : t("Send to seller ({name})", { name: target.name });

  return (
    <button
      type="button"
      onClick={relay}
      disabled={pending}
      title={label}
      className={cn(
        "flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 transition-colors disabled:opacity-70",
        confirming ? "bg-destructive/15 text-destructive ring-destructive/40" : "text-[var(--tg-link,var(--primary))] ring-primary/30 hover:bg-primary/10"
      )}
    >
      {pending ? <LoaderCircleIcon className="size-3 animate-spin" /> : sent ? <CheckIcon className="size-3" /> : <CornerUpRightIcon className="size-3" />}
      <span className="truncate">{label}</span>
    </button>
  );
}
