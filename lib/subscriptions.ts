import "server-only";
import { db } from "@/lib/db";
import { startChapaCheckout, verifyChapa } from "@/lib/chapa";
import type { SubscriptionCategory, SubscriptionInfo } from "@/lib/generated/prisma/client";
import { createT } from "@/lib/i18n";
import type { Actor } from "@/lib/marketplace";
import { DomainError } from "@/lib/marketplace-errors";
import { planPriceEtb, SETTING_MARKUP, SETTING_USD_RATE, type PriceSettings } from "@/lib/subscription-catalog";
import { popularSubscriptions } from "@/lib/subscription-seed";
import { escapeHtml, notifyOwners } from "@/lib/telegram/api";
import { credit, debit } from "@/lib/wallet";

/**
 * ሰብስክሪፕሽኖች፦ ደንበኛው እቅድ መርጦ የአካውንቱን መረጃ ያስገባል፣ ከዋሌቱ ወይም በቻፓ ይከፍላል።
 * ክፍያው ሲረጋገጥ ባለቤቶቹ በቴሌግራም ይነገራቸዋል፤ አድሚኑ በድርጅቱ ካርድ ገዝቶ ያስገባና "ገብቷል" ይላል።
 * (እንደ Netflix፣ ChatGPT ያሉት ለሌላ ሰው በራሱ የሚገዛበት API ስለሌላቸው ማስገባቱ በሰው ነው።)
 */

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new DomainError("You don't have permission to do this.");
}

// ---- ቅንብሮች

export async function getPriceSettings(): Promise<PriceSettings> {
  const rows = await db.appSetting.findMany({ where: { key: { in: [SETTING_USD_RATE, SETTING_MARKUP] } } });
  const value = (key: string) => Number(rows.find((row) => row.key === key)?.value ?? 0) || 0;
  return { usdRate: value(SETTING_USD_RATE), markupPercent: value(SETTING_MARKUP) };
}

export async function savePriceSettings(actor: Actor, settings: PriceSettings) {
  assertAdmin(actor);
  await db.$transaction([
    db.appSetting.upsert({ where: { key: SETTING_USD_RATE }, create: { key: SETTING_USD_RATE, value: String(settings.usdRate) }, update: { value: String(settings.usdRate) } }),
    db.appSetting.upsert({ where: { key: SETTING_MARKUP }, create: { key: SETTING_MARKUP, value: String(settings.markupPercent) }, update: { value: String(settings.markupPercent) } }),
  ]);
}

// ---- ካታሎግ (አድሚን)

/** ታዋቂዎቹን ያስገባል፤ በስም አስቀድሞ ያለ አገልግሎት አይነካም። የገቡትን ብዛት ይመልሳል። */
export async function addPopularServices(actor: Actor): Promise<number> {
  assertAdmin(actor);
  const existing = new Set((await db.subscriptionService.findMany({ select: { name: true } })).map((row) => row.name));
  let added = 0;
  for (const [index, service] of popularSubscriptions.entries()) {
    if (existing.has(service.name)) continue;
    await db.subscriptionService.create({
      data: {
        name: service.name,
        category: service.category,
        description: service.description,
        requiredInfo: service.requiredInfo,
        position: index,
        plans: { create: service.plans.map((plan, position) => ({ label: plan.label, usdCents: Math.round(plan.usd * 100), position })) },
      },
    });
    added += 1;
  }
  return added;
}

export async function createService(actor: Actor, input: { name: string; category: SubscriptionCategory; requiredInfo: SubscriptionInfo; description: string }) {
  assertAdmin(actor);
  const taken = await db.subscriptionService.findUnique({ where: { name: input.name }, select: { id: true } });
  if (taken) throw new DomainError("A service with this name already exists.");
  return db.subscriptionService.create({ data: { ...input, position: 1000 }, select: { id: true } });
}

export async function setServiceActive(actor: Actor, serviceId: string, active: boolean) {
  assertAdmin(actor);
  await db.subscriptionService.update({ where: { id: serviceId }, data: { active } });
}

export async function addPlan(actor: Actor, serviceId: string, input: { label: string; usdCents: number; priceEtb: number | null }) {
  assertAdmin(actor);
  const count = await db.subscriptionPlan.count({ where: { serviceId } });
  await db.subscriptionPlan.create({ data: { serviceId, ...input, position: count } });
}

export async function updatePlan(actor: Actor, planId: string, input: { usdCents: number; priceEtb: number | null; active: boolean }) {
  assertAdmin(actor);
  await db.subscriptionPlan.update({ where: { id: planId }, data: input });
}

// ---- ትዕዛዝ

async function notifyPaid(orderId: string) {
  const order = await db.subscriptionOrder.findUnique({
    where: { id: orderId },
    select: { serviceName: true, planLabel: true, amountEtb: true, accountInfo: true, payMethod: true, user: { select: { name: true } } },
  });
  if (!order) return;
  const t = createT(process.env.TELEGRAM_REPORT_LOCALE === "en" ? "en" : "am");
  const lines = [
    `🧾 <b>${escapeHtml(t("New subscription order"))}</b>`,
    `${escapeHtml(order.serviceName)} · ${escapeHtml(order.planLabel)}`,
    `${escapeHtml(t("Customer"))}: ${escapeHtml(order.user.name)}`,
    order.accountInfo ? `${escapeHtml(t("Account"))}: <code>${escapeHtml(order.accountInfo)}</code>` : "",
    `${order.amountEtb} ETB · ${order.payMethod === "CHAPA" ? "Chapa" : escapeHtml(t("Wallet"))}`,
  ].filter(Boolean);
  await notifyOwners(lines.join("\n")).catch((error) => console.error("subscriptions: notify failed", error));
}

async function loadPlan(planId: string) {
  const plan = await db.subscriptionPlan.findUnique({
    where: { id: planId },
    select: { id: true, label: true, usdCents: true, priceEtb: true, active: true, service: { select: { name: true, active: true, requiredInfo: true } } },
  });
  if (!plan || !plan.active || !plan.service.active) throw new DomainError("This subscription isn't available right now.");
  const price = planPriceEtb(plan, await getPriceSettings());
  if (!price) throw new DomainError("This subscription isn't available right now.");
  return { ...plan, price };
}

function checkAccountInfo(info: SubscriptionInfo, value: string) {
  if (info === "NONE") return;
  const ok =
    info === "EMAIL" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : info === "PHONE" ? /^\+?\d[\d\s-]{6,18}$/.test(value) : /^@?[A-Za-z0-9_.]{3,40}$/.test(value);
  if (!ok) throw new DomainError("Check the account details you entered.");
}

export type OrderInput = { planId: string; accountInfo: string; note: string };

/** ከዋሌት ይከፍላል፤ ትዕዛዙ ወዲያው "ተከፍሏል" ይሆናል። */
export async function orderWithWallet(actor: Actor, input: OrderInput) {
  const plan = await loadPlan(input.planId);
  checkAccountInfo(plan.service.requiredInfo, input.accountInfo);
  const order = await db.$transaction(async (tx) => {
    const created = await tx.subscriptionOrder.create({
      data: {
        userId: actor.id,
        planId: plan.id,
        serviceName: plan.service.name,
        planLabel: plan.label,
        amountEtb: plan.price,
        accountInfo: input.accountInfo,
        note: input.note,
        payMethod: "WALLET",
        status: "PAID",
        paidAt: new Date(),
      },
      select: { id: true },
    });
    await debit(tx, actor.id, plan.price, "SUBSCRIPTION_PAYMENT", { subscriptionOrderId: created.id });
    return created;
  }, TX_OPTIONS);
  await notifyPaid(order.id);
  return order;
}

/** በቻፓ፦ ትዕዛዙ "ክፍያ ይጠብቃል" ሆኖ ይፈጠራል፤ ደንበኛው ወደ ቻፓ ገጹ ይላካል። */
export async function orderWithChapa(actor: Actor & { email: string; name: string }, input: OrderInput) {
  const plan = await loadPlan(input.planId);
  checkAccountInfo(plan.service.requiredInfo, input.accountInfo);
  const order = await db.subscriptionOrder.create({
    data: {
      userId: actor.id,
      planId: plan.id,
      serviceName: plan.service.name,
      planLabel: plan.label,
      amountEtb: plan.price,
      accountInfo: input.accountInfo,
      note: input.note,
      payMethod: "CHAPA",
    },
    select: { id: true },
  });
  return { orderId: order.id, checkoutUrl: await chapaCheckoutFor(order.id, actor) };
}

/** ለያልተከፈለ ትዕዛዝ አዲስ የቻፓ ገጽ (ቻፓ አንድ tx_ref ሁለት ጊዜ ስለማይቀበል በየሙከራው አዲስ ነው)። */
async function chapaCheckoutFor(orderId: string, customer: { email: string; name: string }) {
  const order = await db.subscriptionOrder.findUniqueOrThrow({ where: { id: orderId }, select: { amountEtb: true, serviceName: true, planLabel: true } });
  const txRef = `ecs-${orderId}-${Date.now().toString(36)}`;
  await db.subscriptionOrder.update({ where: { id: orderId }, data: { chapaRef: txRef } });
  return startChapaCheckout({
    amountEtb: order.amountEtb,
    txRef,
    email: customer.email,
    name: customer.name,
    description: `${order.serviceName} ${order.planLabel}`,
    returnPath: `/dashboard/subscriptions/${orderId}?check=1`,
  });
}

export async function retryChapa(actor: Actor & { email: string; name: string }, orderId: string) {
  const order = await db.subscriptionOrder.findFirst({ where: { id: orderId, userId: actor.id, status: "AWAITING_PAYMENT", payMethod: "CHAPA" }, select: { id: true } });
  if (!order) throw new DomainError("This order can't be changed this way right now.");
  // ቀድሞ የተከፈለ ከሆነ ሁለተኛ ጊዜ እንዳያስከፍል መጀመሪያ እናረጋግጣለን።
  if (await confirmChapaForOrder(orderId)) return null;
  return chapaCheckoutFor(orderId, actor);
}

/**
 * የቻፓ ክፍያን ያረጋግጣል (ደንበኛው ሲመለስ፣ callback እና webhook ሁሉም ይህን ይጠራሉ)። ደጋግሞ ቢጠራ አንድ ጊዜ ብቻ ይቆጠራል።
 * tx_ref "ecs-{orderId}-{ሙከራ}" ስለሆነ በቆየ የክፍያ ገጽ የተከፈለም፣ ከተሰረዘ በኋላ የተከፈለም አይጠፋም።
 * ትዕዛዙ ተከፍሎ ከሆነ true ይመልሳል።
 */
export async function confirmChapaPayment(txRef: string): Promise<boolean> {
  const orderId = /^ecs-([a-z0-9]+)-[a-z0-9]+$/.exec(txRef)?.[1];
  if (!orderId) return false;
  const order = await db.subscriptionOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, amountEtb: true, payMethod: true } });
  if (!order || order.payMethod !== "CHAPA") return false;
  if (order.status === "PAID" || order.status === "DELIVERED" || order.status === "REFUNDED") return true;
  const result = await verifyChapa(txRef);
  if (!result?.paid || result.currency !== "ETB" || result.amountEtb < order.amountEtb) return false;
  const { count } = await db.subscriptionOrder.updateMany({
    where: { id: order.id, status: { in: ["AWAITING_PAYMENT", "CANCELLED"] } },
    data: { status: "PAID", paidAt: new Date(), chapaRef: txRef },
  });
  if (count === 1) await notifyPaid(order.id);
  return true;
}

export async function confirmChapaForOrder(orderId: string): Promise<boolean> {
  const order = await db.subscriptionOrder.findUnique({ where: { id: orderId }, select: { chapaRef: true, status: true } });
  if (!order) return false;
  if (order.status !== "AWAITING_PAYMENT") return order.status === "PAID" || order.status === "DELIVERED";
  return order.chapaRef ? confirmChapaPayment(order.chapaRef) : false;
}

export async function cancelUnpaidOrder(actor: Actor, orderId: string) {
  // ደንበኛው ከፍሎ ገና ካልተረጋገጠ እንዳይሰረዝ መጀመሪያ እንፈትሻለን።
  if (await confirmChapaForOrder(orderId)) throw new DomainError("This order is already paid.");
  const { count } = await db.subscriptionOrder.updateMany({ where: { id: orderId, userId: actor.id, status: "AWAITING_PAYMENT" }, data: { status: "CANCELLED" } });
  if (count !== 1) throw new DomainError("This order can't be changed this way right now.");
}

/** አድሚኑ ገዝቶ ካስገባ በኋላ፦ ለደንበኛው የሚታየው ማስታወሻ (ኮድ፣ የመግቢያ መረጃ ወይም "በአካውንትዎ ገብቷል")። */
export async function deliverOrder(actor: Actor, orderId: string, deliveryNote: string) {
  assertAdmin(actor);
  const { count } = await db.subscriptionOrder.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "DELIVERED", deliveredAt: new Date(), deliveryNote },
  });
  if (count !== 1) throw new DomainError("This order can't be changed this way right now.");
}

/** ማስገባት ካልተቻለ ብሩ ወደ ደንበኛው ዋሌት ይመለሳል (በቻፓ የከፈለም ቢሆን)። */
export async function refundOrder(actor: Actor, orderId: string, reason: string) {
  assertAdmin(actor);
  await db.$transaction(async (tx) => {
    const { count } = await tx.subscriptionOrder.updateMany({ where: { id: orderId, status: "PAID" }, data: { status: "REFUNDED", deliveryNote: reason || null } });
    if (count !== 1) throw new DomainError("This order can't be changed this way right now.");
    const order = await tx.subscriptionOrder.findUniqueOrThrow({ where: { id: orderId }, select: { userId: true, amountEtb: true } });
    await credit(tx, order.userId, order.amountEtb, "SUBSCRIPTION_REFUND", { subscriptionOrderId: orderId });
  }, TX_OPTIONS);
}
