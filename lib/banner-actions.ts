"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import * as banners from "@/lib/banners";
import { DomainError, type Actor } from "@/lib/marketplace";
import type { MessageKey } from "@/lib/messages";
import { getTelegramViewer } from "@/lib/telegram/access";

const id = z.string().min(1).max(64);
const INVALID: ActionResult = { ok: false, message: "Check what you entered and try again." };
const NO_PERMISSION: ActionResult = { ok: false, message: "You don't have permission to do this." };

async function owner(): Promise<Actor | null> {
  const viewer = await getTelegramViewer();
  return viewer?.isAdmin ? { id: viewer.userId, isAdmin: true } : null;
}

async function run(message: MessageKey, work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.key };
    console.error(error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const text = (max: number) => z.string().trim().max(max).default("");
const optional = (max: number) => z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), z.string().trim().max(max).nullable().default(null));
/** datetime-local (በአዲስ አበባ ሰዓት) → UTC። */
const addisTime = z.preprocess(
  (value) => (typeof value === "string" && value ? new Date(`${value}:00+03:00`) : null),
  z.date().nullable().refine((value) => value === null || !Number.isNaN(value.getTime()))
);
/** ሊንኩ ወደ ድረ-ገጹ ገጽ (/subscriptions) ወይም https:// ብቻ (javascript: እንዳይገባ)። */
const link = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith("/") || /^https:\/\/[^\s]+$/i.test(value))
    .nullable()
    .default(null)
);

const bannerSchema = z.object({
  titleEn: z.string().trim().min(2).max(140),
  titleAm: z.string().trim().min(2).max(140),
  textEn: text(300),
  textAm: text(300),
  linkUrl: link,
  linkLabelEn: text(40),
  linkLabelAm: text(40),
  code: optional(40),
  startsAt: addisTime,
  endsAt: addisTime,
});

export async function saveBannerAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = bannerSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const bannerId = data.get("id");
  if (typeof bannerId === "string" && bannerId) {
    return run("Banner saved.", () => banners.updateBanner(admin, bannerId, parsed.data));
  }
  return run("Banner published.", () => banners.createBanner(admin, parsed.data));
}

export async function setBannerActiveAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z.object({ id, active: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), active: data.get("active") });
  if (!parsed.success) return INVALID;
  const active = parsed.data.active === "true";
  return run(active ? "Banner turned on." : "Banner turned off.", () => banners.setBannerActive(admin, parsed.data.id, active));
}

export async function deleteBannerAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = id.safeParse(data.get("id"));
  if (!parsed.success) return INVALID;
  return run("Banner deleted.", () => banners.deleteBanner(admin, parsed.data));
}
