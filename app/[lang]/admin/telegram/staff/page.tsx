import { Trash2Icon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { StaffSwitch } from "@/components/telegram/staff-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTelegramStaffAction, removeTelegramStaffAction, resetStaffPasswordAction } from "@/lib/actions";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { requireAdmin } from "@/lib/session";
import { PERMISSIONS } from "@/lib/telegram/permissions";
import { listStaff } from "@/lib/telegram/staff";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Staff");

const groups: { id: (typeof PERMISSIONS)[number]["group"]; title: MessageKey }[] = [
  { id: "market", title: "Marketplace" },
  { id: "telegram", title: "Telegram" },
];

/**
 * ሰራተኞች፦ አድሚኑ በኢሜይልና በፓስዎርድ ይመዘግባቸዋል፤ በ/staff ገብተው አድሚኑ ያበራላቸውን ገጾችና መረጃ ብቻ ያያሉ።
 * ፓስዎርዳቸውን ራሳቸው ይቀይራሉ፤ ሲረሱ አድሚኑ እዚህ አዲስ ይሰጣቸዋል።
 */
export default async function AdminStaffPage() {
  const t = await getT();
  await requireAdmin();
  const staff = await listStaff();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Staff")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("Add your staff with an email and a starting password. They sign in at ethiocomputer.com/staff, can change their password themselves, and see only what you turn on below.")}
        </p>
      </div>

      <ActionForm action={addTelegramStaffAction} className="grid gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-name">{t("Name")}</Label>
          <Input id="staff-name" name="name" required maxLength={80} placeholder={t("For example: Hana")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-email">{t("Email")}</Label>
          <Input id="staff-email" name="email" type="email" required maxLength={200} dir="ltr" autoComplete="off" placeholder="name@gmail.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-password">{t("Starting password")}</Label>
          <Input id="staff-password" name="password" type="text" required minLength={8} maxLength={128} dir="ltr" autoComplete="off" placeholder={t("At least 8 characters")} />
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
                  {member.hasPassword ? null : <span className="text-xs text-muted-foreground">{t("No password yet. Signs in with Google only.")}</span>}
                </div>
                <ActionButton action={removeTelegramStaffAction} id={member.id} variant="ghost" size="icon-sm" aria-label={t("Remove {name}", { name: member.name })} title={t("Remove")}>
                  <Trash2Icon />
                </ActionButton>
              </div>
              <StaffSwitch staffId={member.id} checked={member.active} label={t("Can sign in")} hint={t("Turn off to block this person without deleting them.")} />
              <ActionForm action={resetStaffPasswordAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={member.id} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={`reset-${member.id}`}>{member.hasPassword ? t("New password (if they forgot it)") : t("Set a password")}</Label>
                  <Input id={`reset-${member.id}`} name="password" type="text" required minLength={8} maxLength={128} dir="ltr" autoComplete="off" placeholder={t("At least 8 characters")} />
                </div>
                <SubmitButton variant="outline">{t("Save password")}</SubmitButton>
              </ActionForm>
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-3 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">{t(group.title)}</p>
                  {PERMISSIONS.filter((permission) => permission.group === group.id).map((permission) => (
                    <StaffSwitch key={permission.id} staffId={member.id} permission={permission.id} checked={member.can[permission.id]} label={t(permission.label)} hint={t(permission.hint)} />
                  ))}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
