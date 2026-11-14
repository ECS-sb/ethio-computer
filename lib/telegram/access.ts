import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/session";
import { ALL_PERMISSIONS, resolvePermissions, type Permission, type Permissions } from "@/lib/telegram/permissions";

export type TelegramViewer = {
  userId: string;
  name: string;
  isAdmin: boolean;
  /** ሰራተኛ ከሆነ የTelegramStaff መለያው፤ አድሚን ከሆነ null */
  staffId: string | null;
  can: Permissions;
};

/** የቴሌግራም ገጾችን ማን እያየ ነው፦ አድሚን (ሁሉንም ያያል) ወይም ንቁ ሰራተኛ (አድሚኑ የፈቀደለትን ብቻ)። ሌላ ሰው null። */
export const getTelegramViewer = cache(async (): Promise<TelegramViewer | null> => {
  const user = await getCurrentUser();
  if (!user || user.suspended) return null;
  if (user.isAdmin) return { userId: user.id, name: user.name, isAdmin: true, staffId: null, can: ALL_PERMISSIONS };
  // በGoogle የገባ፣ ኢሜይሉ የተረጋገጠ ተጠቃሚ ብቻ ሰራተኛ ሊሆን ይችላል።
  if (!user.emailVerified) return null;
  const staff = await db.telegramStaff.findUnique({ where: { email: user.email.toLowerCase() } });
  if (!staff?.active) return null;
  return { userId: user.id, name: staff.name, isAdmin: false, staffId: staff.id, can: resolvePermissions(staff.permissions) };
});

/** ገጹን ማየት የማይችል ሰው 404 ያገኛል (ገጹ መኖሩም እንዳይታወቅ)፤ ያልገባ ሰው ወደ መግቢያ ይላካል። */
export async function requireTelegramViewer(permission: Permission = "chats"): Promise<TelegramViewer> {
  await requireUser("/admin/telegram");
  const viewer = await getTelegramViewer();
  if (!viewer || !viewer.can.chats || !viewer.can[permission]) notFound();
  return viewer;
}
