import "server-only";
import { db } from "@/lib/db";
import { resolvePermissions, type Permission } from "@/lib/telegram/permissions";

export async function listStaff() {
  const rows = await db.telegramStaff.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  return rows.map((row) => ({ id: row.id, email: row.email, name: row.name, active: row.active, can: resolvePermissions(row.permissions) }));
}

/** ሰራተኛ ይጨምራል፤ ኢሜይሉ ቀድሞ ካለ ስሙን ያድሳል እና መልሶ ያበራዋል። */
export async function addStaff(email: string, name: string) {
  await db.telegramStaff.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name },
    update: { name, active: true },
  });
}

export async function setStaffPermission(id: string, permission: Permission, enabled: boolean) {
  const row = await db.telegramStaff.findUniqueOrThrow({ where: { id } });
  const stored = row.permissions && typeof row.permissions === "object" && !Array.isArray(row.permissions) ? row.permissions : {};
  await db.telegramStaff.update({ where: { id }, data: { permissions: { ...stored, [permission]: enabled } } });
}

export async function setStaffActive(id: string, active: boolean) {
  await db.telegramStaff.update({ where: { id }, data: { active } });
}

export async function removeStaff(id: string) {
  await db.telegramStaff.delete({ where: { id } });
}
