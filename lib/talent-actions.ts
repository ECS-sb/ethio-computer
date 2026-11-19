"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { optimizeScreenshot } from "@/lib/images";
import { DomainError, type Actor } from "@/lib/marketplace";
import type { MessageKey } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import * as talent from "@/lib/talent";
import {
  AUDIO_TYPES,
  gigCategories,
  MAX_GIG_AUDIO,
  MAX_GIG_AUDIO_BYTES,
  MAX_GIG_IMAGE_BYTES,
  MAX_GIG_IMAGES,
  MAX_JOB_FILE_BYTES,
  MAX_JOB_FILES,
  MAX_PORTFOLIO_LINKS,
} from "@/lib/talent-catalog";
import { getTelegramViewer } from "@/lib/telegram/access";
import type { Permission } from "@/lib/telegram/permissions";

const id = z.string().min(1).max(64);
const INVALID: ActionResult = { ok: false, message: "Check what you entered and try again." };
const NO_PERMISSION: ActionResult = { ok: false, message: "You don't have permission to do this." };

const field = (data: FormData, name: string) => data.get(name) ?? undefined;
const files = (data: FormData, name: string) => data.getAll(name).filter((entry): entry is File => entry instanceof File && entry.size > 0);

async function run(message: MessageKey, work: () => Promise<Partial<ActionResult> | void>): Promise<ActionResult> {
  try {
    const extra = await work();
    revalidatePath("/", "layout");
    return { ok: true, message, ...(extra ?? {}) };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, message: error.key };
    console.error(error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** ገጹ ላይ ያለ ተጠቃሚ (የታገደ ሰው requireUser ላይ ይመለሳል)። */
async function actor(next: string): Promise<Actor> {
  const user = await requireUser(next);
  return { id: user.id, isAdmin: false };
}

async function staffActor(permission: Permission): Promise<Actor | null> {
  const viewer = await getTelegramViewer();
  return viewer?.can[permission] ? { id: viewer.userId, isAdmin: true } : null;
}

// ---- አገልግሎት

const gigSchema = z.object({
  category: z.enum(gigCategories.map((category) => category.value) as [string, ...string[]]),
  title: z.string().trim().min(8).max(90),
  description: z.string().trim().min(30).max(3000),
  priceEtb: z.coerce.number().int().min(100).max(1_000_000),
  deliveryDays: z.coerce.number().int().min(1).max(60),
});

export async function createGigAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/talent/new");
  const parsed = gigSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const links = String(field(data, "portfolioLinks") ?? "")
    .split(/\s+/)
    .map((link) => link.trim())
    .filter(Boolean);
  if (links.length > MAX_PORTFOLIO_LINKS) return { ok: false, message: "Portfolio links must be YouTube or Google Drive links." };

  const images = files(data, "images");
  const audios = files(data, "audios");
  if (images.length > MAX_GIG_IMAGES || audios.length > MAX_GIG_AUDIO) return INVALID;
  if (images.some((file) => file.size > MAX_GIG_IMAGE_BYTES) || audios.some((file) => file.size > MAX_GIG_AUDIO_BYTES)) {
    return { ok: false, message: "A file is too large." };
  }
  if (audios.some((file) => !AUDIO_TYPES.includes(file.type))) return { ok: false, message: "Voice samples must be MP3, M4A, WAV or OGG files." };

  return run("Your service was sent for review.", async () => {
    const imageSamples = await Promise.all(
      images.map(async (file) => ({ kind: "image" as const, mimeType: "image/webp", ...(await optimizeScreenshot(file)) }))
    );
    const audioSamples = await Promise.all(
      audios.map(async (file) => ({ kind: "audio" as const, mimeType: file.type, data: new Uint8Array(await file.arrayBuffer()) }))
    );
    const { category, ...rest } = parsed.data;
    const created = await talent.createGig(
      user,
      { ...rest, category: category as talent.GigInput["category"], portfolioLinks: links },
      [...imageSamples, ...audioSamples]
    );
    return { id: created.id };
  });
}

export async function setGigPausedAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/talent");
  const parsed = z.object({ id, paused: z.enum(["true", "false"]) }).safeParse({ id: field(data, "id"), paused: field(data, "paused") });
  if (!parsed.success) return INVALID;
  const paused = parsed.data.paused === "true";
  return run(paused ? "Service paused." : "Service is live again.", () => talent.setGigPaused(user, parsed.data.id, paused));
}

export async function reviewGigAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("listings");
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(300).default("") })
    .safeParse({ id: field(data, "id"), decision: field(data, "decision"), reason: field(data, "reason") });
  if (!parsed.success) return INVALID;
  const approve = parsed.data.decision === "approve";
  return run(approve ? "Service approved." : "Service rejected.", () => talent.reviewGig(admin, parsed.data.id, approve, parsed.data.reason));
}

// ---- ቻትና መቅጠር

export async function startGigThreadAction(data: FormData): Promise<ActionResult> {
  const parsed = id.safeParse(field(data, "gigId"));
  if (!parsed.success) return INVALID;
  const user = await actor(`/talent/${parsed.data}`);
  return run("Conversation started.", async () => ({ id: (await talent.startGigThread(user, parsed.data)).id }));
}

export async function sendGigMessageAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/jobs");
  const parsed = z
    .object({ threadId: id, body: z.string().trim().min(1).max(2000) })
    .safeParse({ threadId: field(data, "threadId"), body: field(data, "body") });
  if (!parsed.success) return INVALID;
  return run("Sent.", () => talent.sendGigMessage(user, parsed.data.threadId, parsed.data.body));
}

export async function hireGigAction(data: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ gigId: id, amountEtb: z.coerce.number().int().min(1).max(1_000_000), brief: z.string().trim().min(10).max(3000) })
    .safeParse({ gigId: field(data, "gigId"), amountEtb: field(data, "amountEtb"), brief: field(data, "brief") });
  if (!parsed.success) return INVALID;
  const user = await actor(`/talent/${parsed.data.gigId}`);
  return run("Job request sent. The pro will accept it soon.", async () => {
    const hired = await talent.hireGig(user, parsed.data.gigId, parsed.data.amountEtb, parsed.data.brief);
    return { id: hired.threadId };
  });
}

// ---- የስራው ደረጃዎች

function jobAction(message: MessageKey, work: (user: Actor, jobId: string) => Promise<unknown>) {
  return async (data: FormData): Promise<ActionResult> => {
    const user = await actor("/dashboard/jobs");
    const parsed = id.safeParse(field(data, "id"));
    if (!parsed.success) return INVALID;
    return run(message, async () => {
      await work(user, parsed.data);
    });
  };
}

const acceptJobImpl = jobAction("Job accepted. Good luck!", talent.acceptJob);
const declineJobImpl = jobAction("Cancelled. The money was returned to the client's wallet.", talent.declineJob);
const approveJobImpl = jobAction("Approved. The pro was paid.", talent.approveJob);
const openJobDisputeImpl = jobAction("Dispute opened. An admin will review the chat.", talent.openJobDispute);

export async function acceptJobAction(data: FormData) {
  return acceptJobImpl(data);
}
export async function declineJobAction(data: FormData) {
  return declineJobImpl(data);
}
export async function approveJobAction(data: FormData) {
  return approveJobImpl(data);
}
export async function openJobDisputeAction(data: FormData) {
  return openJobDisputeImpl(data);
}

export async function deliverJobAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/jobs");
  const parsed = z.object({ id, note: z.string().trim().max(2000).default("") }).safeParse({ id: field(data, "id"), note: field(data, "note") });
  if (!parsed.success) return INVALID;
  const uploads = files(data, "files");
  if (uploads.length > MAX_JOB_FILES) return INVALID;
  if (uploads.some((file) => file.size > MAX_JOB_FILE_BYTES)) return { ok: false, message: "A file is too large." };
  return run("Delivered. The client will check your work.", async () => {
    const delivery = await Promise.all(
      uploads.map(async (file) => ({
        name: file.name.slice(0, 120) || "file",
        mimeType: file.type || "application/octet-stream",
        data: new Uint8Array(await file.arrayBuffer()),
      }))
    );
    await talent.deliverJob(user, parsed.data.id, parsed.data.note, delivery);
  });
}

export async function requestRevisionAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/jobs");
  const parsed = z.object({ id, note: z.string().trim().min(5).max(2000) }).safeParse({ id: field(data, "id"), note: field(data, "note") });
  if (!parsed.success) return INVALID;
  return run("Sent. The pro will make the changes.", () => talent.requestRevision(user, parsed.data.id, parsed.data.note));
}

export async function reviewJobAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/jobs");
  const parsed = z
    .object({ id, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") })
    .safeParse({ id: field(data, "id"), rating: field(data, "rating"), comment: field(data, "comment") });
  if (!parsed.success) return INVALID;
  return run("Thank you for your review.", () => talent.reviewJob(user, parsed.data.id, parsed.data.rating, parsed.data.comment));
}

export async function resolveJobAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("ordersDecide");
  if (!admin) return NO_PERMISSION;
  const parsed = z.object({ id, decision: z.enum(["release", "refund"]) }).safeParse({ id: field(data, "id"), decision: field(data, "decision") });
  if (!parsed.success) return INVALID;
  return run(parsed.data.decision === "release" ? "The pro was paid." : "The client was refunded.", () =>
    talent.resolveJob(admin, parsed.data.id, parsed.data.decision)
  );
}
