"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions";

/** የአድሚን ውሳኔ፦ "ማጽደቅ" ወይም በምክንያት "መከልከል" (decision=approve|reject)። */
export function ReviewForm({
  action,
  id,
  approveLabel,
}: {
  action: (data: FormData) => Promise<ActionResult>;
  id: string;
  approveLabel: string;
}) {
  const t = useT();
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton name="decision" value="approve">
        {approveLabel}
      </SubmitButton>
      <Input name="reason" placeholder={t("Reason for rejection")} maxLength={300} aria-label={t("Reason for rejection")} className="h-10 max-w-xs" />
      <SubmitButton name="decision" value="reject" variant="outline">
        {t("Reject")}
      </SubmitButton>
    </ActionForm>
  );
}
