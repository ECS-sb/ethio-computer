"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { localePath } from "@/lib/i18n";

/** ሰራተኞች አድሚኑ በሰጣቸው ኢሜይልና ፓስዎርድ የሚገቡበት ፎርም፤ ሲገቡ ወደ ተፈቀደላቸው የመጀመሪያ ገጽ ይሄዳሉ። */
export function StaffSignIn() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setPending(true);
        const { error } = await authClient.signIn.email({ email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? "") });
        if (error) {
          setPending(false);
          toast.error(error.status === 429 ? t("Too many attempts. Wait a minute and try again.") : t("Wrong email or password."));
          return;
        }
        router.replace(localePath(locale, "/admin"));
        router.refresh();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="staff-login-email">{t("Email")}</Label>
        <Input id="staff-login-email" name="email" type="email" required autoComplete="username" dir="ltr" maxLength={200} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="staff-login-password">{t("Password")}</Label>
        <Input id="staff-login-password" name="password" type="password" required autoComplete="current-password" dir="ltr" maxLength={128} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("Signing in…") : t("Sign in")}
      </Button>
    </form>
  );
}
