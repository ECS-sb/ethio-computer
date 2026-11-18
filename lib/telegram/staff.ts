import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { resolvePermissions, type Permission } from "@/lib/telegram/permissions";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export async function listStaff() {
  const rows = await db.telegramStaff.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
  const withPassword = new Set(
    (
      await db.account.findMany({
        where: { providerId: "credential", password: { not: null }, user: { email: { in: rows.map((row) => row.email) } } },
        select: { user: { select: { email: true } } },
      })
    ).map((account) => account.user.email.toLowerCase())
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    active: row.active,
    hasPassword: withPassword.has(row.email),
    can: resolvePermissions(row.permissions),
  }));
}

/** የBetter Auth የፓስዎርድ መግቢያ (providerId "credential") ያስቀምጣል ወይም ያድሳል። */
async function setCredential(tx: Tx, userId: string, password: string) {
  const hash = await hashPassword(password);
  const existing = await tx.account.findFirst({ where: { userId, providerId: "credential" } });
  if (existing) await tx.account.update({ where: { id: existing.id }, data: { password: hash } });
  else await tx.account.create({ data: { id: randomUUID(), accountId: userId, providerId: "credential", userId, password: hash } });
}

/**
 * ሰራተኛ ይጨምራል፦ በዚህ ኢሜይል አካውንት ከሌለ ይከፍታል፣ ፓስዎርዱን ያስቀምጣል (ካለ ይተካዋል)።
 * ኢሜይሉ አድሚኑ ስላስገባው እንደተረጋገጠ ይቆጠራል፤ ሰራተኛው በዚያው ኢሜይል በGoogleም መግባት ይችላል።
 */
export async function addStaff(email: string, name: string, password: string) {
  const address = email.toLowerCase();
  await db.$transaction(async (tx) => {
    const user =
      (await tx.user.findUnique({ where: { email: address } })) ??
      (await tx.user.create({ data: { id: randomUUID(), name, email: address, emailVerified: true } }));
    if (!user.emailVerified) await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    await setCredential(tx, user.id, password);
    await tx.telegramStaff.upsert({ where: { email: address }, create: { email: address, name }, update: { name, active: true } });
  });
}

/** አድሚኑ የሰራተኛውን ፓስዎርድ ይቀይራል (ሲረሳ)፤ የቆዩ መግቢያዎቹ ይዘጋሉ፣ በአዲሱ እንደገና መግባት አለበት። */
export async function resetStaffPassword(id: string, password: string) {
  await db.$transaction(async (tx) => {
    const staff = await tx.telegramStaff.findUniqueOrThrow({ where: { id } });
    const user = await tx.user.findUniqueOrThrow({ where: { email: staff.email } });
    await setCredential(tx, user.id, password);
    await tx.session.deleteMany({ where: { userId: user.id } });
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

/** ሰራተኛውን ያስወግዳል፤ አድሚኑ የሰጠውን ፓስዎርድና ክፍት መግቢያዎቹንም ያጠፋል (የራሱ የGoogle መግቢያ ካለው ይቀራል)። */
export async function removeStaff(id: string) {
  await db.$transaction(async (tx) => {
    const staff = await tx.telegramStaff.delete({ where: { id } });
    const user = await tx.user.findUnique({ where: { email: staff.email } });
    if (!user) return;
    await tx.account.deleteMany({ where: { userId: user.id, providerId: "credential" } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
}

/** ገብቶ ያለው ሰው በፓስዎርድ መግባት ይችላል? (በGoogle ብቻ የሚገባ አድሚን ፓስዎርድ የለውም) */
export async function hasPassword(userId: string) {
  return (await db.account.count({ where: { userId, providerId: "credential", password: { not: null } } })) > 0;
}

/** የሁሉም ሰራተኞች ኢሜይሎች (በትንሽ ፊደል)። */
export async function staffEmails() {
  return new Set((await db.telegramStaff.findMany({ select: { email: true } })).map((row) => row.email));
}
