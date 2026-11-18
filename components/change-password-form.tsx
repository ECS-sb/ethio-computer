"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

/** ሰራተኛው የራሱን ፓስዎርድ ይቀይራል፤ በሌሎች መሳሪያዎች ላይ የተከፈቱ መግቢያዎቹ ይዘጋሉ። */
export function ChangePasswordForm() {
  const t = useT();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex max-w-md flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const currentPassword = String(data.get("current") ?? "");
        const newPassword = String(data.get("next") ?? "");
        if (newPassword.length < 8) return toast.error(t("Use a password of at least 8 characters."));
        if (newPassword !== data.get("confirm")) return toast.error(t("The new passwords don't match."));
        setPending(true);
        const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
        setPending(false);
        if (error) return toast.error(error.status === 400 ? t("The current password is wrong.") : t("Something went wrong. Please try again."));
        form.reset();
        toast.success(t("Password changed."));
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-current">{t("Current password")}</Label>
        <Input id="password-current" name="current" type="password" required autoComplete="current-password" dir="ltr" maxLength={128} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-next">{t("New password")}</Label>
        <Input id="password-next" name="next" type="password" required minLength={8} autoComplete="new-password" dir="ltr" maxLength={128} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-confirm">{t("Repeat the new password")}</Label>
        <Input id="password-confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" dir="ltr" maxLength={128} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("Sending…") : t("Change password")}
      </Button>
    </form>
  );
}
