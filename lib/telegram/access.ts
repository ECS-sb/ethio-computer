import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/session";
import { canSeeCategory } from "@/lib/telegram/accounts";
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

/**
 * የማርኬቱ አድሚን ገጾች፦ አድሚኑ ወይም ከፈቃዶቹ አንዱ የበራለት ሰራተኛ ብቻ ይገባል፤ ሌላ ሰው 404 ያገኛል።
 * ያልገባ ሰው ወደ መግቢያ ይላካል (እዚያ ለሰራተኞች የኢሜይል መግቢያ ሊንክ አለ)።
 */
export async function requireStaff(path: string, ...anyOf: Permission[]): Promise<TelegramViewer> {
  await requireUser(path);
  const viewer = await getTelegramViewer();
  if (!viewer || !anyOf.some((permission) => viewer.can[permission])) notFound();
  return viewer;
}

/** ገጹን ማየት የማይችል ሰው 404 ያገኛል (ገጹ መኖሩም እንዳይታወቅ)፤ ያልገባ ሰው ወደ መግቢያ ይላካል። */
export async function requireTelegramViewer(permission: Permission = "chats"): Promise<TelegramViewer> {
  await requireUser("/admin/telegram");
  const viewer = await getTelegramViewer();
  if (!viewer || !viewer.can.chats || !viewer.can[permission]) notFound();
  return viewer;
}

/**
 * ቻቱ ሰራተኛው ማየት በሚችለው ምድብ (የሽያጭ/የትምህርት ቤት) አካውንት ውስጥ ነው? አድሚን ሁሉንም ያያል።
 * by፦ በቻቱ id፣ በመልዕክቱ id (ፋይል ሲጠየቅ) ወይም በማስጠንቀቂያው id።
 */
export async function canSeeChat(viewer: TelegramViewer, by: { chatId?: string; messageId?: string; alertId?: string }): Promise<boolean> {
  if (viewer.isAdmin) return true;
  const select = { connection: { select: { category: true } } } as const;
  const chat = by.chatId
    ? await db.telegramChat.findUnique({ where: { id: by.chatId }, select })
    : by.messageId
      ? (await db.telegramMessage.findUnique({ where: { id: by.messageId }, select: { chat: { select } } }))?.chat
      : by.alertId
        ? (await db.telegramAlert.findUnique({ where: { id: by.alertId }, select: { chat: { select } } }))?.chat
        : null;
  return Boolean(chat && canSeeCategory(viewer.can, chat.connection.category));
}

/** የትምህርት ቤቱ ትንታኔ ወይም ማርኬቲንግ ገጽ፦ የትምህርት ቤቱን ቴሌግራም ማየትና ይህንን ፈቃድ የተሰጠው ብቻ (አድሚኑ ሁሉንም)። */
export async function requireSchoolViewer(permission: "schoolAnalytics" | "marketing", path: string): Promise<TelegramViewer> {
  await requireUser(path);
  const viewer = await getTelegramViewer();
  if (!viewer || !canUseSchool(viewer, permission)) notFound();
  return viewer;
}

export function canUseSchool(viewer: TelegramViewer, permission: "schoolAnalytics" | "marketing"): boolean {
  return viewer.can.chats && viewer.can.schoolAccount && viewer.can[permission];
}
