"use client";

import { MessageCircleIcon } from "lucide-react";
import { SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { RedirectForm } from "@/components/talent/redirect-form";
import { startGigThreadAction } from "@/lib/talent-actions";

export function StartChatButton({ gigId }: { gigId: string }) {
  const t = useT();
  return (
    <RedirectForm action={startGigThreadAction} to="/dashboard/jobs/{id}">
      <input type="hidden" name="gigId" value={gigId} />
      <SubmitButton variant="outline" size="lg" className="w-full">
        <MessageCircleIcon data-icon="inline-start" />
        {t("Ask a question")}
      </SubmitButton>
    </RedirectForm>
  );
}
