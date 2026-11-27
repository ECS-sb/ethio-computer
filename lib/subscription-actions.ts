"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { chapaEnabled } from "@/lib/chapa";
import { DomainError, type Actor } from "@/lib/marketplace";
import type { MessageKey } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { subscriptionCategories, subscriptionInfoOptions } from "@/lib/subscription-catalog";
import * as subscriptions from "@/lib/subscriptions";
import { getTelegramViewer } from "@/lib/telegram/access";

const id = z.string().min(1).max(64);
const INVALID: ActionResult = { ok: false, message: "Check what you entered and try again." };
const NO_PERMISSION: ActionResult = { ok: false, message: "You don't have permission to do this." };

const field = (data: FormData, name: string) => data.get(name) ?? undefined;
const oneOf = (options: { value: string }[]) => z.enum(options.map((option) => option.value) as [string, ...string[]]);
const optionalEtb = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.coerce.number().int().min(1).max(10_000_000).nullable());

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

/** ትዕዛዞችን የሚያስተናግድ ሰራተኛ (ማስገባትና መመለስ)። */
async function handler(): Promise<Actor | null> {
  const viewer = await getTelegramViewer();
  return viewer?.can.ordersDecide ? { id: viewer.userId, isAdmin: true } : null;
}

/** ካታሎጉንና ዋጋዎቹን የሚቀይረው አድሚኑ ብቻ ነው። */
async function owner(): Promise<Actor | null> {
  const viewer = await getTelegramViewer();
  return viewer?.isAdmin ? { id: viewer.userId, isAdmin: true } : null;
}

// ---- ደንበኛ

const orderSchema = z.object({
  planId: id,
  accountInfo: z.string().trim().max(120).default(""),
  note: z.string().trim().max(500).default(""),
  method: z.enum(["wallet", "chapa"]),
});

/** ይከፍላል፤ ለቻፓ code የክፍያ ገጹ አድራሻ ነው (አሳሹ ወደዚያ ይሄዳል)፣ ለዋሌት id የትዕዛዙ መለያ ነው። */
export async function orderSubscriptionAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/subscriptions");
  const parsed = orderSchema.safeParse({ planId: field(data, "planId"), accountInfo: field(data, "accountInfo"), note: field(data, "note"), method: field(data, "method") });
  if (!parsed.success) return INVALID;
  const { method, ...input } = parsed.data;
  const actor = { id: user.id, isAdmin: false, email: user.email, name: user.name };
  if (method === "chapa") {
    if (!chapaEnabled()) return { ok: false, message: "Paying with Chapa isn't available yet. Pay from your wallet." };
    return run("Opening Chapa…", async () => {
      const { orderId, checkoutUrl } = await subscriptions.orderWithChapa(actor, input);
      return { id: orderId, code: checkoutUrl };
    });
  }
  return run("Paid. We'll activate it soon and let you know here.", async () => ({ id: (await subscriptions.orderWithWallet(actor, input)).id }));
}

export async function retryChapaAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/dashboard/subscriptions");
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Opening Chapa…", async () => {
    const url = await subscriptions.retryChapa({ id: user.id, isAdmin: false, email: user.email, name: user.name }, parsed.data);
    return url ? { id: parsed.data, code: url } : { id: parsed.data };
  });
}

export async function checkChapaAction(data: FormData): Promise<ActionResult> {
  await requireUser("/dashboard/subscriptions");
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  try {
    const paid = await subscriptions.confirmChapaForOrder(parsed.data);
    revalidatePath("/", "layout");
    return paid ? { ok: true, message: "Payment received. We'll activate it soon." } : { ok: false, message: "We haven't received the payment yet." };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function cancelSubscriptionOrderAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/dashboard/subscriptions");
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Order cancelled.", () => subscriptions.cancelUnpaidOrder({ id: user.id, isAdmin: false }, parsed.data));
}

// ---- ትዕዛዝ ማስተናገድ

export async function deliverSubscriptionAction(data: FormData): Promise<ActionResult> {
  const staff = await handler();
  if (!staff) return NO_PERMISSION;
  const parsed = z.object({ id, note: z.string().trim().min(2).max(2000) }).safeParse({ id: field(data, "id"), note: field(data, "note") });
  if (!parsed.success) return INVALID;
  return run("Marked as activated. The customer can see your note.", () => subscriptions.deliverOrder(staff, parsed.data.id, parsed.data.note));
}

export async function refundSubscriptionAction(data: FormData): Promise<ActionResult> {
  const staff = await handler();
  if (!staff) return NO_PERMISSION;
  const parsed = z.object({ id, note: z.string().trim().max(500).default("") }).safeParse({ id: field(data, "id"), note: field(data, "note") });
  if (!parsed.success) return INVALID;
  return run("Refunded to the customer's wallet.", () => subscriptions.refundOrder(staff, parsed.data.id, parsed.data.note));
}

// ---- ካታሎግና ዋጋ (አድሚን)

export async function savePriceSettingsAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ usdRate: z.coerce.number().min(1).max(10_000), markupPercent: z.coerce.number().min(0).max(500), markupEtb: z.coerce.number().int().min(0).max(1_000_000) })
    .safeParse({ usdRate: field(data, "usdRate"), markupPercent: field(data, "markupPercent"), markupEtb: field(data, "markupEtb") });
  if (!parsed.success) return INVALID;
  return run("Prices updated.", () => subscriptions.savePriceSettings(admin, parsed.data));
}

export async function addPopularServicesAction(): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  return run("Popular subscriptions added. Check their prices.", async () => {
    await subscriptions.addPopularServices(admin);
  });
}

export async function createServiceAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(60),
      category: oneOf(subscriptionCategories),
      requiredInfo: oneOf(subscriptionInfoOptions),
      description: z.string().trim().max(300).default(""),
      label: z.string().trim().min(1).max(40),
      usd: z.coerce.number().min(0).max(10_000),
      priceEtb: optionalEtb,
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const { label, usd, priceEtb, category, requiredInfo, ...service } = parsed.data;
  if (usd <= 0 && !priceEtb) return { ok: false, message: "Enter a price in dollars or in birr." };
  return run("Service added.", async () => {
    const created = await subscriptions.createService(admin, {
      ...service,
      category: category as Parameters<typeof subscriptions.createService>[1]["category"],
      requiredInfo: requiredInfo as Parameters<typeof subscriptions.createService>[1]["requiredInfo"],
    });
    await subscriptions.addPlan(admin, created.id, { label, usdCents: Math.round(usd * 100), priceEtb });
  });
}

export async function addPlanAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, label: z.string().trim().min(1).max(40), usd: z.coerce.number().min(0).max(10_000), priceEtb: optionalEtb })
    .safeParse({ id: field(data, "id"), label: field(data, "label"), usd: field(data, "usd"), priceEtb: field(data, "priceEtb") });
  if (!parsed.success) return INVALID;
  if (parsed.data.usd <= 0 && !parsed.data.priceEtb) return { ok: false, message: "Enter a price in dollars or in birr." };
  return run("Plan added.", () =>
    subscriptions.addPlan(admin, parsed.data.id, { label: parsed.data.label, usdCents: Math.round(parsed.data.usd * 100), priceEtb: parsed.data.priceEtb })
  );
}

export async function updatePlanAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, usd: z.coerce.number().min(0).max(10_000), priceEtb: optionalEtb, active: z.enum(["on", "off"]).default("off") })
    .safeParse({ id: field(data, "id"), usd: field(data, "usd"), priceEtb: field(data, "priceEtb"), active: field(data, "active") ?? "off" });
  if (!parsed.success) return INVALID;
  return run("Plan saved.", () =>
    subscriptions.updatePlan(admin, parsed.data.id, { usdCents: Math.round(parsed.data.usd * 100), priceEtb: parsed.data.priceEtb, active: parsed.data.active === "on" })
  );
}

export async function setServiceActiveAction(data: FormData): Promise<ActionResult> {
  const admin = await owner();
  if (!admin) return NO_PERMISSION;
  const parsed = z.object({ id, active: z.enum(["true", "false"]) }).safeParse({ id: field(data, "id"), active: field(data, "active") });
  if (!parsed.success) return INVALID;
  const active = parsed.data.active === "true";
  return run(active ? "Service shown." : "Service hidden.", () => subscriptions.setServiceActive(admin, parsed.data.id, active));
}
