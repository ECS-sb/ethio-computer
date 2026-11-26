"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import * as electronics from "@/lib/electronics";
import { MAX_PRODUCT_IMAGE_BYTES, MAX_PRODUCT_IMAGES, productCategories, productCities, productConditions } from "@/lib/electronics-catalog";
import { optimizeScreenshot } from "@/lib/images";
import { DomainError, type Actor } from "@/lib/marketplace";
import type { MessageKey } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { getTelegramViewer } from "@/lib/telegram/access";
import type { Permission } from "@/lib/telegram/permissions";

const id = z.string().min(1).max(64);
const INVALID: ActionResult = { ok: false, message: "Check what you entered and try again." };
const NO_PERMISSION: ActionResult = { ok: false, message: "You don't have permission to do this." };

const field = (data: FormData, name: string) => data.get(name) ?? undefined;
const oneOf = (options: { value: string }[]) => z.enum(options.map((option) => option.value) as [string, ...string[]]);

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

// ---- እቃ

const productSchema = z.object({
  category: oneOf(productCategories),
  condition: oneOf(productConditions),
  title: z.string().trim().min(5).max(90),
  brand: z.string().trim().max(40).default(""),
  description: z.string().trim().min(20).max(3000),
  priceEtb: z.coerce.number().int().min(50).max(5_000_000),
  city: oneOf(productCities),
});

export async function createProductAction(data: FormData): Promise<ActionResult> {
  const current = await requireUser("/dashboard/electronics/new");
  const user: Actor = { id: current.id, isAdmin: false };
  // አድሚኑ የሚለጥፈው የኢትዮ ኮምፒውተር የራሱ እቃ ነው።
  const official = current.isAdmin;
  const parsed = productSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const photos = data.getAll("screenshots").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photos.length < 1 || photos.length > MAX_PRODUCT_IMAGES) return { ok: false, message: "Add 1 to 4 photos of the item." };
  if (photos.some((file) => file.size > MAX_PRODUCT_IMAGE_BYTES)) return { ok: false, message: "This image is too large." };

  return run(official ? "Your item is live." : "Your item was sent for review.", async () => {
    const images = await Promise.all(photos.map(optimizeScreenshot));
    const { category, condition, ...rest } = parsed.data;
    const created = await electronics.createProduct(
      user,
      { ...rest, category: category as electronics.ProductInput["category"], condition: condition as electronics.ProductInput["condition"] },
      images,
      official
    );
    return { id: created.id };
  });
}

export async function setProductPausedAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/electronics");
  const parsed = z.object({ id, paused: z.enum(["true", "false"]) }).safeParse({ id: field(data, "id"), paused: field(data, "paused") });
  if (!parsed.success) return INVALID;
  const paused = parsed.data.paused === "true";
  return run(paused ? "Item paused." : "Item is live again.", () => electronics.setProductPaused(user, parsed.data.id, paused));
}

export async function setProductPriceAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/electronics");
  const parsed = z
    .object({ id, priceEtb: z.coerce.number().int().min(50).max(5_000_000) })
    .safeParse({ id: field(data, "id"), priceEtb: field(data, "priceEtb") });
  if (!parsed.success) return INVALID;
  return run("Price updated.", () => electronics.setProductPrice(user, parsed.data.id, parsed.data.priceEtb));
}

export async function reviewProductAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("listings");
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(300).default("") })
    .safeParse({ id: field(data, "id"), decision: field(data, "decision"), reason: field(data, "reason") });
  if (!parsed.success) return INVALID;
  const approve = parsed.data.decision === "approve";
  return run(approve ? "Item approved." : "Item rejected.", () => electronics.reviewProduct(admin, parsed.data.id, approve, parsed.data.reason));
}

// ---- ቻትና መግዛት

export async function startProductThreadAction(data: FormData): Promise<ActionResult> {
  const parsed = id.safeParse(field(data, "productId"));
  if (!parsed.success) return INVALID;
  const user = await actor(`/electronics/${parsed.data}`);
  return run("Conversation started.", async () => ({ id: (await electronics.startProductThread(user, parsed.data)).id }));
}

export async function sendProductMessageAction(data: FormData): Promise<ActionResult> {
  const user = await actor("/dashboard/electronics/deals");
  const parsed = z
    .object({ threadId: id, body: z.string().trim().min(1).max(2000) })
    .safeParse({ threadId: field(data, "threadId"), body: field(data, "body") });
  if (!parsed.success) return INVALID;
  return run("Sent.", () => electronics.sendProductMessage(user, parsed.data.threadId, parsed.data.body));
}

export async function buyProductAction(data: FormData): Promise<ActionResult> {
  const parsed = id.safeParse(field(data, "productId"));
  if (!parsed.success) return INVALID;
  const user = await actor(`/electronics/${parsed.data}`);
  return run("Paid. Agree with the seller in the chat on where to meet.", async () => ({ id: (await electronics.buyProduct(user, parsed.data)).threadId }));
}

// ---- የትዕዛዙ ደረጃዎች

function orderAction(message: MessageKey, work: (user: Actor, orderId: string) => Promise<unknown>) {
  return async (data: FormData): Promise<ActionResult> => {
    const user = await actor("/dashboard/electronics/deals");
    const parsed = id.safeParse(field(data, "id"));
    if (!parsed.success) return INVALID;
    return run(message, async () => {
      await work(user, parsed.data);
    });
  };
}

const handedOverImpl = orderAction("Marked as handed over. The buyer will confirm.", electronics.markHandedOver);
const confirmImpl = orderAction("Confirmed. The seller was paid.", electronics.confirmReceived);
const cancelImpl = orderAction("Cancelled. The money was returned to the buyer's wallet.", electronics.cancelOrder);
const disputeImpl = orderAction("Dispute opened. An admin will review the chat.", electronics.openProductDispute);

export async function markHandedOverAction(data: FormData) {
  return handedOverImpl(data);
}
export async function confirmReceivedAction(data: FormData) {
  return confirmImpl(data);
}
export async function cancelProductOrderAction(data: FormData) {
  return cancelImpl(data);
}
export async function openProductDisputeAction(data: FormData) {
  return disputeImpl(data);
}

export async function resolveProductOrderAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("ordersDecide");
  if (!admin) return NO_PERMISSION;
  const parsed = z.object({ id, decision: z.enum(["release", "refund"]) }).safeParse({ id: field(data, "id"), decision: field(data, "decision") });
  if (!parsed.success) return INVALID;
  return run(parsed.data.decision === "release" ? "The seller was paid." : "The buyer was refunded.", () =>
    electronics.resolveProductOrder(admin, parsed.data.id, parsed.data.decision)
  );
}
