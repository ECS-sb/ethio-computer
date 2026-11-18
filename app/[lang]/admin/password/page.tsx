import { ChangePasswordForm } from "@/components/change-password-form";
import { getT, pageTitle } from "@/lib/i18n-server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getTelegramViewer } from "@/lib/telegram/access";
import { hasPassword } from "@/lib/telegram/staff";

export const generateMetadata = pageTitle("Change password");

/** ማንኛውም ሰራተኛ (ፈቃዱ ምንም ይሁን) የራሱን ፓስዎርድ እዚህ ይቀይራል። */
export default async function ChangePasswordPage() {
  const t = await getT();
  await requireUser("/admin/password");
  const viewer = await getTelegramViewer();
  if (!viewer) notFound();
  const canChange = await hasPassword(viewer.userId);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Change password")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("Choose a password only you know. After you change it, you're signed out on your other devices.")}</p>
      </div>
      {canChange ? (
        <ChangePasswordForm />
      ) : (
        <p className="max-w-md rounded-xl bg-card/70 p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">{t("You sign in with Google, so this account has no password.")}</p>
      )}
    </>
  );
}
