import "server-only";
import { db } from "@/lib/db";
import { findBlockedContent } from "@/lib/chat-guard";
import { ELECTRONICS_FEE_PERCENT } from "@/lib/electronics-catalog";
import { feeFor } from "@/lib/fees";
import type { Prisma, ProductCategory, ProductCondition, ProductOrderStatus } from "@/lib/generated/prisma/client";
import { guardText, type Actor, type ListingImageInput } from "@/lib/marketplace";
import { DomainError } from "@/lib/marketplace-errors";
import type { MessageKey } from "@/lib/messages";
import { credit, debit } from "@/lib/wallet";

/**
 * ኤሌክትሮኒክስ፦ ገዢው ሲገዛ ብሩ ከዋሌቱ ተቀንሶ በድርጅቱ ይያዛል፣ እቃውም ለሌሎች ይደበቃል (RESERVED)።
 * ሻጩ "አስረክቤያለሁ" ሲል ገዢው ተቀብሎ ሲያረጋግጥ ብሩ (ከክፍያው በኋላ) ለሻጩ ይገባል። ችግር ሲኖር አድሚኑ ይወስናል።
 * እያንዳንዱ የሁኔታ ለውጥ updateMany ከሁኔታው ጋር ስለሆነ በአንድ ጊዜ የሚመጡ ሁለት ጥያቄዎች አንድን ትዕዛዝ ሁለት ጊዜ አይቀይሩትም።
 */

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

type Tx = Prisma.TransactionClient | typeof db;

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new DomainError("You don't have permission to do this.");
}

function assertPublicText(...texts: string[]) {
  if (texts.some((text) => findBlockedContent(text))) {
    throw new DomainError("Remove phone numbers, usernames, emails, links and other apps from the text.");
  }
}

// ---- እቃ

export type ProductInput = {
  category: ProductCategory;
  condition: ProductCondition;
  title: string;
  brand: string;
  description: string;
  priceEtb: number;
  city: string;
};

/** official፦ የኢትዮ ኮምፒውተር የራሱ እቃ (አድሚኑ ብቻ)፤ ግምገማ ሳይጠብቅ ወዲያው ይታያል። */
export async function createProduct(actor: Actor, input: ProductInput, images: ListingImageInput[], official = false) {
  assertPublicText(input.title, input.brand, input.description);
  if (images.length === 0) throw new DomainError("Add at least one photo of the item.");
  const active = await db.product.count({ where: { sellerId: actor.id, status: { in: ["PENDING", "APPROVED", "PAUSED", "RESERVED"] } } });
  if (active >= (official ? 200 : 20)) throw new DomainError("You can have up to 20 items for sale.");
  return db.product.create({
    data: {
      ...input,
      sellerId: actor.id,
      official,
      status: official ? "APPROVED" : "PENDING",
      images: { create: images.map((image, position) => ({ ...image, position })) },
    },
    select: { id: true },
  });
}

export async function setProductPaused(actor: Actor, productId: string, paused: boolean) {
  const { count } = await db.product.updateMany({
    where: { id: productId, sellerId: actor.id, status: paused ? "APPROVED" : "PAUSED" },
    data: { status: paused ? "PAUSED" : "APPROVED" },
  });
  if (count !== 1) throw new DomainError("This item can't be changed right now.");
}

/** ዋጋው በቻት ሲቀነስ ሻጩ ያስተካክለዋል፤ ገዢው በአዲሱ ዋጋ ይገዛል። */
export async function setProductPrice(actor: Actor, productId: string, priceEtb: number) {
  const { count } = await db.product.updateMany({
    where: { id: productId, sellerId: actor.id, status: { in: ["PENDING", "APPROVED", "PAUSED"] } },
    data: { priceEtb },
  });
  if (count !== 1) throw new DomainError("This item can't be changed right now.");
}

export async function reviewProduct(actor: Actor, productId: string, approve: boolean, reason?: string) {
  assertAdmin(actor);
  const { count } = await db.product.updateMany({
    where: { id: productId, status: "PENDING" },
    data: approve ? { status: "APPROVED", rejectReason: null } : { status: "REJECTED", rejectReason: reason || null },
  });
  if (count !== 1) throw new DomainError("This item has already been reviewed.");
}

// ---- ቻት

async function findThread(actor: Actor, threadId: string) {
  const thread = await db.productThread.findFirst({
    where: { id: threadId, OR: [{ buyerId: actor.id }, { product: { sellerId: actor.id } }] },
    select: { id: true },
  });
  if (!thread) throw new DomainError("This conversation couldn't be found.");
  return thread;
}

export async function startProductThread(actor: Actor, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { sellerId: true, status: true } });
  if (!product || product.status !== "APPROVED") throw new DomainError("This item isn't available right now.");
  if (product.sellerId === actor.id) throw new DomainError("This is your own item.");
  return db.productThread.upsert({
    where: { productId_buyerId: { productId, buyerId: actor.id } },
    create: { productId, buyerId: actor.id },
    update: {},
    select: { id: true },
  });
}

async function postMessage(tx: Tx, threadId: string, senderId: string, body: string, system: boolean) {
  await tx.productMessage.create({ data: { threadId, senderId, body, system } });
  await tx.productThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
}

/** የሲስተም መልዕክት፦ body የlib/messages.ts ቁልፍ ነው፤ በገጹ ላይ በተመልካቹ ቋንቋ ይተረጎማል። */
function systemNote(tx: Tx, threadId: string, senderId: string, key: MessageKey) {
  return postMessage(tx, threadId, senderId, key, true);
}

export async function sendProductMessage(actor: Actor, threadId: string, body: string) {
  await findThread(actor, threadId);
  await guardText(actor, body, [], threadId);
  await postMessage(db, threadId, actor.id, body, false);
}

// ---- ትዕዛዝ

/** በተለጠፈው ዋጋ ይገዛል (ዋጋው በቻት ከተቀነሰ ሻጩ መጀመሪያ ዋጋውን ያስተካክላል)። */
export async function buyProduct(actor: Actor, productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { sellerId: true, status: true, priceEtb: true, official: true, seller: { select: { suspended: true } } },
  });
  if (!product || product.status !== "APPROVED" || product.seller.suspended) throw new DomainError("This item isn't available right now.");
  if (product.sellerId === actor.id) throw new DomainError("This is your own item.");
  const thread = await startProductThread(actor, productId);

  return db.$transaction(async (tx) => {
    // ሁለት ገዢዎች በአንድ ጊዜ ቢገዙ አንዱ ብቻ ያልፋል።
    const { count } = await tx.product.updateMany({ where: { id: productId, status: "APPROVED" }, data: { status: "RESERVED" } });
    if (count !== 1) throw new DomainError("This item isn't available right now.");
    const order = await tx.productOrder.create({
      data: {
        productId,
        threadId: thread.id,
        buyerId: actor.id,
        sellerId: product.sellerId,
        amountEtb: product.priceEtb,
        // የራሳችን እቃ ብሩ ሙሉ በሙሉ የድርጅቱ ስለሆነ ክፍያ አይቆረጥም።
        feePercent: product.official ? 0 : ELECTRONICS_FEE_PERCENT,
      },
      select: { id: true },
    });
    await debit(tx, actor.id, product.priceEtb, "PRODUCT_PAYMENT", { productOrderId: order.id });
    await systemNote(tx, thread.id, actor.id, "The buyer paid. The money is held by Ethio Computer until the buyer confirms receiving the item.");
    return { orderId: order.id, threadId: thread.id };
  }, TX_OPTIONS);
}

type Who = { buyerId?: string; sellerId?: string };

async function moveOrder(tx: Tx, orderId: string, who: Who, from: ProductOrderStatus[], data: Prisma.ProductOrderUpdateManyMutationInput) {
  const { count } = await tx.productOrder.updateMany({ where: { id: orderId, ...who, status: { in: from } }, data });
  if (count !== 1) throw new DomainError("This order can't be changed this way right now.");
  return tx.productOrder.findUniqueOrThrow({
    where: { id: orderId },
    select: { threadId: true, productId: true, buyerId: true, sellerId: true, amountEtb: true, feePercent: true },
  });
}

type Moved = Awaited<ReturnType<typeof moveOrder>>;

async function refund(tx: Tx, orderId: string, order: Moved) {
  await credit(tx, order.buyerId, order.amountEtb, "PRODUCT_REFUND", { productOrderId: orderId });
}

async function paySeller(tx: Tx, orderId: string, order: Moved) {
  const { feeEtb, payoutEtb } = feeFor(order.amountEtb, order.feePercent);
  await tx.productOrder.update({ where: { id: orderId }, data: { feeEtb, payoutEtb } });
  if (payoutEtb > 0) await credit(tx, order.sellerId, payoutEtb, "PRODUCT_EARNING", { productOrderId: orderId });
  await tx.product.update({ where: { id: order.productId }, data: { status: "SOLD" } });
}

export async function markHandedOver(actor: Actor, orderId: string) {
  await db.$transaction(async (tx) => {
    const moved = await moveOrder(tx, orderId, { sellerId: actor.id }, ["PAID"], { status: "HANDED_OVER", handedOverAt: new Date() });
    await systemNote(tx, moved.threadId, actor.id, "The seller says the item was handed over. Buyer: check it, then confirm you received it.");
  }, TX_OPTIONS);
}

/** ገዢው እቃውን ሲያረጋግጥ ብሩ (ከድርጅቱ ክፍያ በኋላ) ወዲያውኑ ወደ ሻጩ ዋሌት ይገባል። */
export async function confirmReceived(actor: Actor, orderId: string) {
  await db.$transaction(async (tx) => {
    const moved = await moveOrder(tx, orderId, { buyerId: actor.id }, ["PAID", "HANDED_OVER"], { status: "COMPLETED", completedAt: new Date() });
    await paySeller(tx, orderId, moved);
    await systemNote(tx, moved.threadId, actor.id, "The buyer confirmed receiving the item. The seller was paid.");
  }, TX_OPTIONS);
}

/** ከማስረከቡ በፊት ገዢውም ሻጩም መሰረዝ ይችላሉ፤ ብሩ ሙሉ በሙሉ ይመለሳል፣ እቃውም እንደገና ይታያል። */
export async function cancelOrder(actor: Actor, orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.productOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] }, select: { buyerId: true } });
    if (!order) throw new DomainError("This order can't be changed this way right now.");
    const byBuyer = order.buyerId === actor.id;
    const moved = await moveOrder(tx, orderId, byBuyer ? { buyerId: actor.id } : { sellerId: actor.id }, ["PAID"], { status: "CANCELLED" });
    await refund(tx, orderId, moved);
    await tx.product.updateMany({ where: { id: moved.productId, status: "RESERVED" }, data: { status: "APPROVED" } });
    await systemNote(
      tx,
      moved.threadId,
      actor.id,
      byBuyer ? "The buyer cancelled. The money was returned to their wallet." : "The seller cancelled. The money was returned to the buyer's wallet."
    );
  }, TX_OPTIONS);
}

export async function openProductDispute(actor: Actor, orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.productOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: actor.id }, { sellerId: actor.id }] }, select: { id: true } });
    if (!order) throw new DomainError("A dispute can't be opened for this order.");
    const { count } = await tx.productOrder.updateMany({ where: { id: orderId, status: { in: ["PAID", "HANDED_OVER"] } }, data: { status: "DISPUTED" } });
    if (count !== 1) throw new DomainError("A dispute can't be opened for this order.");
    const moved = await tx.productOrder.findUniqueOrThrow({ where: { id: orderId }, select: { threadId: true } });
    await systemNote(tx, moved.threadId, actor.id, "A dispute was opened. An Ethio Computer admin will read this chat and decide.");
  }, TX_OPTIONS);
}

/** አድሚኑ፦ ለሻጩ መክፈል (release) ወይም ለገዢው መመለስ (refund)። ከተመለሰ እቃው ሻጩ እስኪያስተካክለው ይቆማል። */
export async function resolveProductOrder(actor: Actor, orderId: string, decision: "release" | "refund") {
  assertAdmin(actor);
  await db.$transaction(async (tx) => {
    if (decision === "release") {
      const moved = await moveOrder(tx, orderId, {}, ["PAID", "HANDED_OVER", "DISPUTED"], { status: "COMPLETED", completedAt: new Date() });
      await paySeller(tx, orderId, moved);
      await systemNote(tx, moved.threadId, actor.id, "An admin completed the order and paid the seller.");
    } else {
      const moved = await moveOrder(tx, orderId, {}, ["PAID", "HANDED_OVER", "DISPUTED"], { status: "REFUNDED" });
      await refund(tx, orderId, moved);
      await tx.product.updateMany({ where: { id: moved.productId, status: "RESERVED" }, data: { status: "PAUSED" } });
      await systemNote(tx, moved.threadId, actor.id, "An admin refunded the buyer.");
    }
  }, TX_OPTIONS);
}
