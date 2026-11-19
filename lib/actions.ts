"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { banks, categories, countries, depositMethods, MAX_SCREENSHOT_BYTES, MAX_SCREENSHOTS, platforms, reportReasons } from "@/lib/catalog";
import { db } from "@/lib/db";
import { localePath } from "@/lib/i18n";
import { optimizeScreenshot } from "@/lib/images";
import { reviewListing, reviewListingInBackground } from "@/lib/listing-review";
import * as market from "@/lib/marketplace";
import type { MessageKey } from "@/lib/messages";
import { isAdminEmail, requestLocale, requireAdmin, requireUser } from "@/lib/session";
import { aiEnabled } from "@/lib/telegram/ai";
import { analyzeChat, analyzePending } from "@/lib/telegram/analyze";
import * as channels from "@/lib/telegram/channel-store";
import { canSeeChat, getTelegramViewer } from "@/lib/telegram/access";
import { isPermission, type Permission } from "@/lib/telegram/permissions";
import * as outbox from "@/lib/telegram/outbox";
import * as staff from "@/lib/telegram/staff";
import { suggestionFor } from "@/lib/telegram/suggest";
import { sendAlertNotifications } from "@/lib/telegram/report";

export type ActionResult = { ok: boolean; message: MessageKey; code?: string; id?: string };

const inList = (options: { value: string }[]) => z.string().refine((value) => options.some((option) => option.value === value));
const id = z.string().min(1).max(64);
const money = z.coerce.number().int().min(1).max(1_000_000_000);
const optionalNumber = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), schema.optional());

const INVALID: ActionResult = { ok: false, message: "Check what you entered and try again." };

async function run(message: MessageKey, work: () => Promise<Partial<ActionResult> | void>): Promise<ActionResult> {
  try {
    const extra = await work();
    revalidatePath("/", "layout");
    return { ok: true, message, ...(extra ?? {}) };
  } catch (error) {
    if (error instanceof market.DomainError) return { ok: false, message: error.key };
    console.error(error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const field = (data: FormData, name: string) => data.get(name) ?? undefined;

const listingSchema = z.object({
  platform: z.string().refine((value) => platforms.some((platform) => platform.id === value)),
  username: z.string().trim().regex(/^@?[A-Za-z0-9._-]{1,60}$/),
  followers: z.coerce.number().int().min(0).max(5_000_000_000),
  posts: optionalNumber(z.coerce.number().int().min(0).max(100_000_000)),
  priceEtb: money,
  category: inList(categories),
  country: inList(countries),
  femaleShare: optionalNumber(z.coerce.number().int().min(0).max(100)),
  engagement: optionalNumber(z.coerce.number().min(0).max(100)),
  joinedYear: optionalNumber(z.coerce.number().int().min(2004).max(new Date().getFullYear())),
  description: z.string().trim().max(2000).default(""),
});

export async function createListingAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/sell");
  const parsed = listingSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const originalEmail = data.get("originalEmail") === "on";
  const special = data.get("special") === "on";
  const isYoutube = parsed.data.platform === "youtube";
  const youtube = {
    monetized: isYoutube && data.get("monetized") === "on",
    strikeFree: isYoutube && data.get("strikeFree") === "on",
    noAdsense: isYoutube && data.get("noAdsense") === "on",
  };

  const screenshots = data.getAll("screenshots").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (screenshots.length < 1 || screenshots.length > MAX_SCREENSHOTS) return { ok: false, message: "Add 1 to 4 screenshots." };
  if (screenshots.some((file) => file.size > MAX_SCREENSHOT_BYTES)) return { ok: false, message: "This image is too large." };

  return run("Your listing was sent for review.", async () => {
    const images = await Promise.all(screenshots.map(optimizeScreenshot));
    const created = await market.createListing(user, { ...parsed.data, originalEmail, special, ...youtube }, images);
    // AI ግምገማው ሻጩን አያስጠብቅም፤ ምላሹ ከተላከ በኋላ ይሰራል።
    after(() => reviewListingInBackground(created.id));
    return { code: created.verificationCode, id: created.id };
  });
}

export async function updatePriceAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id, priceEtb: money }).safeParse({ id: field(data, "id"), priceEtb: field(data, "priceEtb") });
  if (!parsed.success) return INVALID;
  return run("Price updated.", () => market.updateListingPrice(user, parsed.data.id, parsed.data.priceEtb));
}

export async function archiveListingAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Listing removed.", () => market.archiveListing(user, parsed.data));
}

export async function setAvailabilityAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id, available: z.enum(["true", "false"]) })
    .safeParse({ id: field(data, "id"), available: field(data, "available") });
  if (!parsed.success) return INVALID;
  const available = parsed.data.available === "true";
  return run(available ? "Marked as available." : "Marked as sold out.", () =>
    market.setListingAvailability(user, parsed.data.id, available)
  );
}

export async function createOfferAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ listingId: id, amountEtb: money, note: z.string().trim().max(500).default(""), handover: z.enum(["SELF", "AGENT"]).default("SELF") })
    .safeParse({ listingId: field(data, "listingId"), amountEtb: field(data, "amountEtb"), note: field(data, "note"), handover: field(data, "handover") });
  if (!parsed.success) return INVALID;
  return run("Your offer was sent to the seller.", async () => {
    await market.createOffer(user, parsed.data.listingId, parsed.data.amountEtb, parsed.data.note, parsed.data.handover);
  });
}

function offerAction(message: MessageKey, work: (actor: market.Actor, offerId: string) => Promise<unknown>) {
  return async (data: FormData): Promise<ActionResult> => {
    const user = await requireUser();
    const parsed = id.safeParse(field(data, "id"));
    if (!parsed.success) return INVALID;
    return run(message, async () => {
      await work(user, parsed.data);
    });
  };
}

const withdrawOfferImpl = offerAction("Offer withdrawn.", market.withdrawOffer);
const rejectOfferImpl = offerAction("Offer declined.", market.rejectOffer);
const acceptOfferImpl = offerAction("Offer accepted. An order was opened.", market.acceptOffer);
const markTransferredImpl = offerAction("Transfer recorded.", market.markTransferred);
const payOrderImpl = offerAction("Paid from your wallet. The money is held until the handover is complete.", market.payOrderFromWallet);
const confirmReceivedImpl = offerAction("Handover confirmed.", market.confirmReceived);
const openDisputeImpl = offerAction("Dispute opened. An admin will review it.", market.openDispute);

export async function withdrawOfferAction(data: FormData) {
  return withdrawOfferImpl(data);
}
export async function rejectOfferAction(data: FormData) {
  return rejectOfferImpl(data);
}
export async function acceptOfferAction(data: FormData) {
  return acceptOfferImpl(data);
}
export async function payOrderAction(data: FormData) {
  return payOrderImpl(data);
}
export async function markTransferredAction(data: FormData) {
  return markTransferredImpl(data);
}
export async function confirmReceivedAction(data: FormData) {
  return confirmReceivedImpl(data);
}
export async function openDisputeAction(data: FormData) {
  return openDisputeImpl(data);
}

export async function startConversationAction(data: FormData): Promise<ActionResult> {
  const listingId = id.safeParse(field(data, "listingId"));
  if (!listingId.success) return INVALID;
  const user = await requireUser(`/accounts/${listingId.data}`);
  let conversationId: string;
  try {
    conversationId = (await market.startConversation(user, listingId.data)).id;
  } catch (error) {
    if (error instanceof market.DomainError) return { ok: false, message: error.key };
    throw error;
  }
  redirect(localePath(await requestLocale(), `/dashboard/messages/${conversationId}`));
}

export async function sendMessageAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ conversationId: id, body: z.string().trim().min(1).max(2000) })
    .safeParse({ conversationId: field(data, "conversationId"), body: field(data, "body") });
  if (!parsed.success) return INVALID;
  return run("Sent.", () => market.sendMessage(user, parsed.data.conversationId, parsed.data.body));
}

export async function createReportAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ listingId: id, reason: inList(reportReasons) })
    .safeParse({ listingId: field(data, "listingId"), reason: field(data, "reason") });
  if (!parsed.success) return INVALID;
  return run("We received your report.", () => market.createReport(user, parsed.data.listingId, parsed.data.reason));
}

export async function createContactAction(data: FormData): Promise<ActionResult> {
  if (data.get("website")) return { ok: true, message: "We received your message." };
  const parsed = z
    .object({ name: z.string().trim().min(1).max(100), email: z.email().max(200), body: z.string().trim().min(1).max(2000) })
    .safeParse({ name: field(data, "name"), email: field(data, "email"), body: field(data, "body") });
  if (!parsed.success) return INVALID;
  return run("We received your message.", async () => {
    await db.contactMessage.create({ data: parsed.data });
  });
}

export async function updateProfileAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{0,20}$/)
    .safeParse(field(data, "phone") ?? "");
  if (!parsed.success) return INVALID;
  return run("Saved.", () => market.updateProfile(user, parsed.data || null));
}

// ---- አድሚን

const NO_PERMISSION: ActionResult = { ok: false, message: "You don't have permission to do this." };

/**
 * የአድሚን ተግባር የሚፈጽመው ሰው፦ አድሚኑ ወይም ፈቃዱ የበራለት ንቁ ሰራተኛ። ፈቃድ ከሌለው null።
 * ሰራተኛው ሲፈቀድለት marketplace.ts እንደ አድሚን ይቀበለዋል፤ መዝገቡ ግን በራሱ መለያ (id) ይያዛል።
 */
async function staffActor(permission: Permission): Promise<(market.Actor & { isFullAdmin: boolean }) | null> {
  const viewer = await getTelegramViewer();
  if (!viewer?.can[permission]) return null;
  return { id: viewer.userId, isAdmin: true, isFullAdmin: viewer.isAdmin };
}

function adminAction(message: MessageKey, permission: Permission, work: (actor: market.Actor, targetId: string) => Promise<unknown>) {
  return async (data: FormData): Promise<ActionResult> => {
    const actor = await staffActor(permission);
    if (!actor) return NO_PERMISSION;
    const parsed = id.safeParse(field(data, "id"));
    if (!parsed.success) return INVALID;
    return run(message, async () => {
      await work(actor, parsed.data);
    });
  };
}

const approveListingImpl = adminAction("Listing approved.", "listings", (actor, target) => market.reviewListing(actor, target, true));
const agentHandedOverImpl = adminAction("Transfer recorded.", "orders", market.agentHandedOver);
const releaseOrderImpl = adminAction("Order completed.", "ordersDecide", market.releaseOrder);
const cancelOrderImpl = adminAction("Order cancelled.", "ordersDecide", market.cancelOrder);
const resolveReportImpl = adminAction("Resolved.", "reports", market.resolveReport);
const resolveContactImpl = adminAction("Resolved.", "reports", market.resolveContactMessage);

const AI_NOT_SET_UP: ActionResult = { ok: false, message: "AI analysis is not set up yet." };

export async function reviewListingWithAiAction(data: FormData): Promise<ActionResult> {
  if (!(await staffActor("listings"))) return NO_PERMISSION;
  if (!aiEnabled()) return AI_NOT_SET_UP;
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Analysis finished.", async () => {
    if (!(await reviewListing(parsed.data))) throw new market.DomainError("AI could not check this listing.");
  });
}

export async function approveListingAction(data: FormData) {
  return approveListingImpl(data);
}
export async function agentHandedOverAction(data: FormData) {
  return agentHandedOverImpl(data);
}
export async function releaseOrderAction(data: FormData) {
  return releaseOrderImpl(data);
}
export async function cancelOrderAction(data: FormData) {
  return cancelOrderImpl(data);
}
export async function resolveReportAction(data: FormData) {
  return resolveReportImpl(data);
}
export async function resolveContactAction(data: FormData) {
  return resolveContactImpl(data);
}
const NOT_ALLOWED: ActionResult = { ok: false, message: "You don't have permission to do this." };

/**
 * የቴሌግራም ተግባራት፦ አድሚን ወይም ፈቃዱ የተሰጠው ሰራተኛ ብቻ።
 * chat ሲሰጥ ያ ቻት ሰራተኛው ማየት በሚችለው ምድብ (የሽያጭ/የትምህርት ቤት) አካውንት ውስጥ መሆን አለበት።
 */
async function telegramAllowed(permission: Permission, chat?: Parameters<typeof canSeeChat>[1]): Promise<boolean> {
  const viewer = await getTelegramViewer();
  if (!viewer?.can.chats || !viewer.can[permission]) return false;
  return chat ? canSeeChat(viewer, chat) : true;
}

export async function resolveTelegramAlertAction(data: FormData): Promise<ActionResult> {
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  if (!(await telegramAllowed("alerts", { alertId: parsed.data }))) return NOT_ALLOWED;
  return run("Resolved.", async () => {
    await db.telegramAlert.update({ where: { id: parsed.data }, data: { resolved: true } });
  });
}

export async function analyzeTelegramChatAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!aiEnabled()) return AI_NOT_SET_UP;
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Analysis finished.", async () => {
    await analyzeChat(parsed.data);
  });
}

export async function analyzePendingTelegramAction(): Promise<ActionResult> {
  await requireAdmin();
  if (!aiEnabled()) return AI_NOT_SET_UP;
  return run("Analysis finished.", async () => {
    const result = await analyzePending({ receipts: 10, chats: 8 });
    if (result.alerts.length > 0) await sendAlertNotifications(result.alerts);
  });
}

// ---- የቴሌግራም ቻናሎች (ከሻጭ የተገዛ፣ ለገዢ የተሸጠ፣ ትርፍ)

const channelStatus = z.preprocess((value) => (value === "" || value === undefined ? null : value), z.enum(["NEGOTIATING", "AGREED", "PAID", "DELIVERED", "REFUNDED", "CANCELLED"]).nullable());
const birr = z.preprocess((value) => (value === "" || value === null || value === undefined ? null : value), z.coerce.number().int().min(0).max(1_000_000_000).nullable());

const channelEditSchema = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  purchasePrice: birr,
  paidToSellerEtb: birr,
  sourceStatus: channelStatus,
  salePrice: birr,
  buyerPaidEtb: birr,
  refundedEtb: birr,
  saleStatus: channelStatus,
});

export async function editTelegramChannelAction(data: FormData): Promise<ActionResult> {
  if (!(await telegramAllowed("profit"))) return NOT_ALLOWED;
  const parsed = channelEditSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const { id: channelId, refundedEtb, ...rest } = parsed.data;
  return run("Saved.", () => channels.editChannel(channelId, { ...rest, refundedEtb: refundedEtb ?? 0 }));
}

export async function linkTelegramChannelsAction(data: FormData): Promise<ActionResult> {
  if (!(await telegramAllowed("channels"))) return NOT_ALLOWED;
  const parsed = z.object({ id, other: id }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  return run("Channels linked.", () => channels.linkChannels(parsed.data.id, parsed.data.other));
}

export async function unlinkTelegramChannelAction(data: FormData): Promise<ActionResult> {
  if (!(await telegramAllowed("channels"))) return NOT_ALLOWED;
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Saved.", () => channels.unlinkChannel(parsed.data));
}

export async function addTelegramChannelAction(data: FormData): Promise<ActionResult> {
  if (!(await telegramAllowed("channels", { chatId: String(data.get("id") ?? "") }))) return NOT_ALLOWED;
  const parsed = z
    .object({
      id,
      side: z.enum(["seller", "buyer"]),
      platform: z.string().trim().min(1).max(40),
      title: z.string().trim().max(200).default(""),
      link: z.string().trim().max(300).default(""),
      price: birr,
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  const { id: chatId, side, ...input } = parsed.data;
  return run("Channel added.", () => channels.addChannel(chatId, side, input));
}

export async function deleteTelegramChannelAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Deleted.", () => channels.deleteChannel(parsed.data));
}

// ---- ከዌብሳይቱ መመለስ፣ የAI የመልስ ሀሳብ፣ "ለገዢው ላክ"

export async function sendTelegramReplyAction(data: FormData): Promise<ActionResult> {
  const viewer = await getTelegramViewer();
  if (!viewer?.can.chats || !viewer.can.reply) return NOT_ALLOWED;
  const parsed = z.object({ id, text: z.string().trim().min(1).max(4000) }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  if (!(await canSeeChat(viewer, { chatId: parsed.data.id }))) return NOT_ALLOWED;
  return run("Sent.", async () => {
    await outbox.sendReply(parsed.data.id, parsed.data.text, { userId: viewer.userId, name: viewer.name });
  });
}

export async function relayTelegramMessageAction(data: FormData): Promise<ActionResult> {
  const viewer = await getTelegramViewer();
  if (!viewer?.can.chats || !viewer.can.reply || !viewer.can.channels) return NOT_ALLOWED;
  const parsed = z.object({ id, to: id }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  if (!(await canSeeChat(viewer, { messageId: parsed.data.id })) || !(await canSeeChat(viewer, { chatId: parsed.data.to }))) return NOT_ALLOWED;
  return run("Sent.", async () => {
    await outbox.relayMessage(parsed.data.id, parsed.data.to, { userId: viewer.userId, name: viewer.name });
  });
}

export type SuggestionResult = { ok: boolean; message: MessageKey; text?: string };

export async function suggestTelegramReplyAction(chatId: string, force: boolean): Promise<SuggestionResult> {
  const viewer = await getTelegramViewer();
  if (!viewer?.can.chats || !viewer.can.reply) return NOT_ALLOWED;
  const parsed = id.safeParse(chatId);
  if (!parsed.success) return INVALID;
  if (!(await canSeeChat(viewer, { chatId: parsed.data }))) return NOT_ALLOWED;
  try {
    const text = await suggestionFor(parsed.data, force === true);
    return text ? { ok: true, message: "Saved.", text } : { ok: false, message: "AI could not suggest a reply for this chat." };
  } catch (error) {
    if (error instanceof market.DomainError) return { ok: false, message: error.key };
    console.error(error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

// ---- ሰራተኞችና ፈቃዶቻቸው (አድሚን ብቻ)

const staffPassword = z.string().min(8).max(128);

export async function addTelegramStaffAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(200), name: z.string().trim().min(1).max(80), password: staffPassword })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false, message: "Check the email, and use a password of at least 8 characters." };
  if (isAdminEmail(parsed.data.email)) return { ok: false, message: "This email is already an admin." };
  return run("Staff member added.", () => staff.addStaff(parsed.data.email, parsed.data.name, parsed.data.password));
}

export async function resetStaffPasswordAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id, password: staffPassword }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false, message: "Use a password of at least 8 characters." };
  return run("Password changed. Give the new password to the staff member.", () => staff.resetStaffPassword(parsed.data.id, parsed.data.password));
}

const onOff = z.enum(["true", "false"]).transform((value) => value === "true");

export async function setTelegramStaffPermissionAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id, permission: z.string().refine(isPermission), enabled: onOff }).safeParse(Object.fromEntries(data));
  if (!parsed.success || !isPermission(parsed.data.permission)) return INVALID;
  const permission = parsed.data.permission;
  return run("Saved.", () => staff.setStaffPermission(parsed.data.id, permission, parsed.data.enabled));
}

/** አድሚኑ አንድን የተገናኘ የቴሌግራም አካውንት የሽያጭ ወይም የትምህርት ቤት ብሎ ይመድባል። */
export async function setTelegramAccountCategoryAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().min(1).max(200), category: z.enum(["SALES", "SCHOOL"]) }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  return run("Saved.", async () => {
    await db.telegramConnection.update({ where: { id: parsed.data.id }, data: { category: parsed.data.category } });
  });
}

export async function setTelegramStaffActiveAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id, enabled: onOff }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return INVALID;
  return run("Saved.", () => staff.setStaffActive(parsed.data.id, parsed.data.enabled));
}

export async function removeTelegramStaffAction(data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = id.safeParse(field(data, "id"));
  if (!parsed.success) return INVALID;
  return run("Removed.", () => staff.removeStaff(parsed.data));
}

export async function rejectListingAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("listings");
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, reason: z.string().trim().max(300).default("") })
    .safeParse({ id: field(data, "id"), reason: field(data, "reason") });
  if (!parsed.success) return INVALID;
  return run("Listing rejected.", () => market.reviewListing(admin, parsed.data.id, false, parsed.data.reason));
}

export async function setUserFlagAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("users");
  if (!admin) return NO_PERMISSION;
  const parsed = z
    .object({ id, flag: z.enum(["suspended", "verifiedSeller"]), value: z.enum(["true", "false"]) })
    .safeParse({ id: field(data, "id"), flag: field(data, "flag"), value: field(data, "value") });
  if (!parsed.success) return INVALID;
  // ሰራተኛ ራሱን፣ አድሚኑን ወይም ሌላ ሰራተኛን መቀየር አይችልም፤ ይህን የሚያደርገው አድሚኑ ብቻ ነው።
  if (!admin.isFullAdmin) {
    const target = await db.user.findUnique({ where: { id: parsed.data.id }, select: { email: true } });
    if (!target) return INVALID;
    const isStaff = (await db.telegramStaff.count({ where: { email: target.email.toLowerCase() } })) > 0;
    if (parsed.data.id === admin.id || isAdminEmail(target.email) || isStaff) return NO_PERMISSION;
  }
  return run("Updated.", () =>
    market.setUserFlags(admin, parsed.data.id, { [parsed.data.flag]: parsed.data.value === "true" })
  );
}

// ---- ዋሌት፣ የሻጭ ማረጋገጫ

const MAX_UPLOAD_BYTES = 4_000_000;

/** የተጫነውን ፎቶ (ደረሰኝ፣ መታወቂያ) አንብቦ ወደ WebP ይቀይራል፤ ከሌለ null። */
async function uploadedImage(data: FormData, name: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const file = data.get(name);
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new market.DomainError("This image is too large.");
  return (await optimizeScreenshot(file)).data;
}

const reviewSchema = z.object({ id, decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(300).default("") });
const reviewInput = (data: FormData) => reviewSchema.safeParse({ id: field(data, "id"), decision: field(data, "decision"), reason: field(data, "reason") });

export async function createDepositAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/dashboard/wallet");
  const parsed = z
    .object({ amountEtb: money, method: inList(depositMethods), reference: z.string().trim().min(4).max(60) })
    .safeParse({ amountEtb: field(data, "amountEtb"), method: field(data, "method"), reference: field(data, "reference") });
  if (!parsed.success) return INVALID;
  return run("We received your deposit. It will show in your wallet after an admin checks it.", async () => {
    const receipt = await uploadedImage(data, "receipt");
    if (!receipt) throw new market.DomainError("Add a photo of the receipt.");
    await market.createDeposit(user, { ...parsed.data, receipt });
  });
}

export async function reviewDepositAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("deposits");
  if (!admin) return NO_PERMISSION;
  const parsed = reviewInput(data);
  if (!parsed.success) return INVALID;
  const approve = parsed.data.decision === "approve";
  return run(approve ? "Added to the user's wallet." : "Rejected.", () => market.reviewDeposit(admin, parsed.data.id, approve, parsed.data.reason));
}

export async function requestWithdrawalAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/dashboard/wallet");
  const parsed = money.safeParse(field(data, "amountEtb"));
  if (!parsed.success) return INVALID;
  return run("Withdrawal requested. The money will be sent to your verified bank account.", () => market.requestWithdrawal(user, parsed.data));
}

export async function reviewWithdrawalAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("withdrawals");
  if (!admin) return NO_PERMISSION;
  const parsed = reviewInput(data);
  if (!parsed.success) return INVALID;
  const paid = parsed.data.decision === "approve";
  return run(paid ? "Marked as paid." : "Rejected. The money was returned to the wallet.", () =>
    market.reviewWithdrawal(admin, parsed.data.id, paid, parsed.data.reason)
  );
}

const verificationSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().regex(/^(\+?251|0)[79]\d{8}$/),
  idType: z.enum(["FAYDA", "PASSPORT"]),
  idNumber: z.string().trim().min(4).max(40),
  bankName: inList(banks),
  bankAccountNumber: z.string().trim().regex(/^[0-9 ]{6,30}$/),
  bankAccountName: z.string().trim().min(3).max(120),
});

export async function submitVerificationAction(data: FormData): Promise<ActionResult> {
  const user = await requireUser("/dashboard/verification");
  const parsed = verificationSchema.safeParse({
    fullName: field(data, "fullName"),
    phone: String(field(data, "phone") ?? "").replace(/[\s-]/g, ""),
    idType: field(data, "idType"),
    idNumber: field(data, "idNumber"),
    bankName: field(data, "bankName"),
    bankAccountNumber: field(data, "bankAccountNumber"),
    bankAccountName: field(data, "bankAccountName"),
  });
  if (!parsed.success) return INVALID;
  return run("Sent for review. We'll check that the names match.", async () => {
    const idImage = await uploadedImage(data, "idImage");
    if (!idImage) throw new market.DomainError("Add a photo of your ID.");
    await market.submitVerification(user, { ...parsed.data, bankAccountNumber: parsed.data.bankAccountNumber.replace(/\s/g, "") }, idImage);
  });
}

export async function reviewVerificationAction(data: FormData): Promise<ActionResult> {
  const admin = await staffActor("verifications");
  if (!admin) return NO_PERMISSION;
  const parsed = reviewInput(data);
  if (!parsed.success) return INVALID;
  const approve = parsed.data.decision === "approve";
  return run(approve ? "Seller verified." : "Rejected.", () => market.reviewVerification(admin, parsed.data.id, approve, parsed.data.reason));
}
