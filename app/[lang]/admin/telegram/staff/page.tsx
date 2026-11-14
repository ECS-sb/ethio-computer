import { Trash2Icon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { StaffSwitch } from "@/components/telegram/staff-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTelegramStaffAction, removeTelegramStaffAction } from "@/lib/actions";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { PERMISSIONS } from "@/lib/telegram/permissions";
import { listStaff } from "@/lib/telegram/staff";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Staff");

/**
 * ቻት የሚመልሱ ሰራተኞች፦ አድሚኑ በኢሜይላቸው ይጨምራቸዋል፣ በGoogle ገብተው የቴሌግራም ገጾችን ብቻ ያያሉ።
 * ለእያንዳንዱ ሰራተኛ የሚያየውን በማብሪያ/ማጥፊያ ይወስናል።
 */
export default async function AdminTelegramStaffPage() {
  const t = await getT();
  await requireAdmin();
  const staff = await listStaff();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Staff")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("Add the people who answer the Telegram chats. They sign in with Google using the email you add here, see only the Telegram pages, and see only what you turn on below.")}
        </p>
      </div>

      <ActionForm action={addTelegramStaffAction} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="staff-name">{t("Name")}</Label>
          <Input id="staff-name" name="name" required maxLength={80} placeholder={t("For example: Hana")} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="staff-email">{t("Google email")}</Label>
          <Input id="staff-email" name="email" type="email" required maxLength={200} dir="ltr" placeholder="name@gmail.com" />
        </div>
        <SubmitButton>{t("Add staff member")}</SubmitButton>
      </ActionForm>

      {staff.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No staff added yet.")}</p>
      ) : (
        <ul className="grid gap-6 xl:grid-cols-2">
          {staff.map((member) => (
            <li key={member.id} className={cn("flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10", !member.active && "opacity-70")}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-semibold">{member.name}</span>
                  <span dir="ltr" className="truncate text-sm text-muted-foreground">
                    {member.email}
                  </span>
                </div>
                <ActionButton action={removeTelegramStaffAction} id={member.id} variant="ghost" size="icon-sm" aria-label={t("Remove {name}", { name: member.name })} title={t("Remove")}>
                  <Trash2Icon />
                </ActionButton>
              </div>
              <StaffSwitch staffId={member.id} checked={member.active} label={t("Can sign in")} hint={t("Turn off to block this person without deleting them.")} />
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                {PERMISSIONS.map((permission) => (
                  <StaffSwitch key={permission.id} staffId={member.id} permission={permission.id} checked={member.can[permission.id]} label={t(permission.label)} hint={t(permission.hint)} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
