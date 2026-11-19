import { Trash2Icon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { StaffSwitch } from "@/components/telegram/staff-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTelegramStaffAction, removeTelegramStaffAction, resetStaffPasswordAction, setTelegramAccountCategoryAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { ACCOUNT_CATEGORIES, categoryLabels, fromDbCategory, toDbCategory } from "@/lib/telegram/accounts";
import { getT, pageTitle } from "@/lib/i18n-server";
import type { MessageKey } from "@/lib/messages";
import { requireAdmin } from "@/lib/session";
import { PERMISSIONS } from "@/lib/telegram/permissions";
import { listStaff } from "@/lib/telegram/staff";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Staff");

const groups: { id: (typeof PERMISSIONS)[number]["group"]; title: MessageKey }[] = [
  { id: "market", title: "Marketplace" },
  { id: "accounts", title: "Which Telegram accounts" },
  { id: "telegram", title: "Telegram" },
];

/**
 * ሰራተኞች፦ አድሚኑ በኢሜይልና በፓስዎርድ ይመዘግባቸዋል፤ በ/staff ገብተው አድሚኑ ያበራላቸውን ገጾችና መረጃ ብቻ ያያሉ።
 * ፓስዎርዳቸውን ራሳቸው ይቀይራሉ፤ ሲረሱ አድሚኑ እዚህ አዲስ ይሰጣቸዋል።
 */
export default async function AdminStaffPage() {
  const t = await getT();
  await requireAdmin();
  const [staff, connections] = await Promise.all([
    listStaff(),
    db.telegramConnection.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, ownerName: true, ownerUsername: true, category: true, isEnabled: true } }),
  ]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("Staff")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("Add your staff with an email and a starting password. They sign in at ethiocomputer.com/staff, can change their password themselves, and see only what you turn on below.")}
        </p>
      </div>

      {/* የተገናኙት የቴሌግራም አካውንቶች፦ አድሚኑ እያንዳንዱን የሽያጭ ወይም የትምህርት ቤት ብሎ ይመድባል። */}
      <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{t("Connected Telegram accounts")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Choose which list each account belongs to. Staff only see the chats of the lists you turn on for them below.")}
          </p>
        </div>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No Telegram account is connected yet.")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {connections.map((connection) => {
              const current = fromDbCategory(connection.category);
              return (
                <li key={connection.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{connection.ownerName}</span>
                    <span dir="ltr" className="truncate text-xs text-muted-foreground">
                      {connection.ownerUsername ? `@${connection.ownerUsername}` : null}
                      {connection.isEnabled ? null : ` · ${t("Paused")}`}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {ACCOUNT_CATEGORIES.map((category) => (
                      <ActionButton
                        key={category}
                        action={setTelegramAccountCategoryAction}
                        id={connection.id}
                        fields={{ category: toDbCategory(category) }}
                        variant={category === current ? "default" : "outline"}
                        size="sm"
                        aria-pressed={category === current}
                        disabled={category === current}
                      >
                        {t(categoryLabels[category])}
                      </ActionButton>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
