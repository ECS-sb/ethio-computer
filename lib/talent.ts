import "server-only";
import { db } from "@/lib/db";
import { findBlockedContent, isAllowedLink } from "@/lib/chat-guard";
import { feeFor } from "@/lib/fees";
import type { GigCategory, JobStatus, Prisma } from "@/lib/generated/prisma/client";
import { guardText, type Actor } from "@/lib/marketplace";
import { DomainError } from "@/lib/marketplace-errors";
import type { MessageKey } from "@/lib/messages";
import { DELIVERY_LINK_HOSTS, MAX_PORTFOLIO_LINKS, PORTFOLIO_LINK_HOSTS, TALENT_FEE_PERCENT } from "@/lib/talent-catalog";
import { credit, debit } from "@/lib/wallet";

/**
 * "ባለሙያ ቅጠሩ"፦ ደንበኛው ሲቀጥር ብሩ ከዋሌቱ ተቀንሶ በድርጅቱ ይያዛል። ባለሙያው ሲቀበል ስራው ይጀምራል፣
 * ሲያስረክብ ደንበኛው ያጸድቃል (ብሩ ለባለሙያው ይገባል) ወይም ማስተካከያ ይጠይቃል። አለመግባባት ሲኖር አድሚኑ ይወስናል።
 * እያንዳንዱ የሁኔታ ለውጥ updateMany ከሁኔታው ጋር ስለሆነ በአንድ ጊዜ የሚመጡ ሁለት ጥያቄዎች አንድን ስራ ሁለት ጊዜ አይቀይሩትም።
 */

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new DomainError("You don't have permission to do this.");
}

/** በአገልግሎቱ ገጽ ላይ በይፋ የሚታይ ጽሑፍ፦ ስልክ፣ username፣ ሊንክ ካለበት አይቀበልም (ማስጠንቀቂያ አይቆጠርም)። */
function assertPublicText(...texts: string[]) {
  if (texts.some((text) => findBlockedContent(text))) {
    throw new DomainError("Remove phone numbers, usernames, emails, links and other apps from the text.");
  }
}

// ---- አገልግሎት (Gig)

export type GigInput = {
  category: GigCategory;
  title: string;
  description: string;
  priceEtb: number;
  deliveryDays: number;
  portfolioLinks: string[];
};

export type GigSampleInput = {
  kind: "image" | "audio";
  mimeType: string;
  data: Uint8Array<ArrayBuffer>;
  thumb?: Uint8Array<ArrayBuffer>;
  width?: number;
  height?: number;
};

/** official፦ የኢትዮ ኮምፒውተር የራሱ አገልግሎት (አድሚኑ ብቻ)፤ ግምገማ ሳይጠብቅ ወዲያው ይታያል። */
export async function createGig(actor: Actor, input: GigInput, samples: GigSampleInput[], official = false) {
  assertPublicText(input.title, input.description);
  const links = [...new Set(input.portfolioLinks.map((link) => link.trim()).filter(Boolean))];
  if (links.length > MAX_PORTFOLIO_LINKS || links.some((link) => !isAllowedLink(link, PORTFOLIO_LINK_HOSTS))) {
    throw new DomainError("Portfolio links must be YouTube or Google Drive links.");
  }
  if (samples.length === 0 && links.length === 0) throw new DomainError("Add at least one portfolio sample.");
  const active = await db.gig.count({ where: { freelancerId: actor.id, status: { in: ["PENDING", "APPROVED", "PAUSED"] } } });
  if (active >= (official ? 50 : 10)) throw new DomainError("You can have up to 10 services.");
  return db.gig.create({
    data: {
      ...input,
      portfolioLinks: links,
      freelancerId: actor.id,
      official,
      status: official ? "APPROVED" : "PENDING",
      samples: { create: samples.map((sample, position) => ({ ...sample, position })) },
    },
    select: { id: true },
  });
}

export async function setGigPaused(actor: Actor, gigId: string, paused: boolean) {
  const { count } = await db.gig.updateMany({
    where: { id: gigId, freelancerId: actor.id, status: paused ? "APPROVED" : "PAUSED" },
    data: { status: paused ? "PAUSED" : "APPROVED" },
  });
  if (count !== 1) throw new DomainError("This service can't be changed right now.");
}

export async function reviewGig(actor: Actor, gigId: string, approve: boolean, reason?: string) {
  assertAdmin(actor);
  const { count } = await db.gig.updateMany({
    where: { id: gigId, status: "PENDING" },
    data: approve ? { status: "APPROVED", rejectReason: null } : { status: "REJECTED", rejectReason: reason || null },
  });
  if (count !== 1) throw new DomainError("This service has already been reviewed.");
}

// ---- ቻት

/** ቻቱን ማየት የሚችሉት ደንበኛውና ባለሙያው ብቻ ናቸው። */
async function findThread(actor: Actor, threadId: string) {
  const thread = await db.gigThread.findFirst({
    where: { id: threadId, OR: [{ clientId: actor.id }, { gig: { freelancerId: actor.id } }] },
    select: { id: true, clientId: true, gig: { select: { freelancerId: true } } },
  });
  if (!thread) throw new DomainError("This conversation couldn't be found.");
  return thread;
}

export async function startGigThread(actor: Actor, gigId: string) {
  const gig = await db.gig.findUnique({ where: { id: gigId }, select: { freelancerId: true, status: true } });
  if (!gig || gig.status !== "APPROVED") throw new DomainError("This service isn't available right now.");
  if (gig.freelancerId === actor.id) throw new DomainError("This is your own service.");
  return db.gigThread.upsert({
    where: { gigId_clientId: { gigId, clientId: actor.id } },
    create: { gigId, clientId: actor.id },
    update: {},
    select: { id: true },
  });
}

export async function sendGigMessage(actor: Actor, threadId: string, body: string) {
  await findThread(actor, threadId);
  await guardText(actor, body, [], threadId);
  await postMessage(db, threadId, actor.id, body, false);
}

type Tx = Prisma.TransactionClient | typeof db;

async function postMessage(tx: Tx, threadId: string, senderId: string, body: string, system: boolean) {
  await tx.gigMessage.create({ data: { threadId, senderId, body, system } });
  await tx.gigThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
}

/** የሲስተም መልዕክት፦ body የlib/messages.ts ቁልፍ ነው፤ በገጹ ላይ በተመልካቹ ቋንቋ ይተረጎማል። */
function systemNote(tx: Tx, threadId: string, senderId: string, key: MessageKey) {
  return postMessage(tx, threadId, senderId, key, true);
}

// ---- ስራ (Job)

export async function hireGig(actor: Actor, gigId: string, amountEtb: number, brief: string) {
  const gig = await db.gig.findUnique({
    where: { id: gigId },
    select: { freelancerId: true, status: true, priceEtb: true, official: true, freelancer: { select: { suspended: true } } },
  });
  if (!gig || gig.status !== "APPROVED" || gig.freelancer.suspended) throw new DomainError("This service isn't available right now.");
  if (gig.freelancerId === actor.id) throw new DomainError("This is your own service.");
  if (amountEtb < gig.priceEtb) throw new DomainError("The amount can't be lower than the service's starting price.");
  const thread = await startGigThread(actor, gigId);
  await guardText(actor, brief, [], thread.id);

  return db.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        gigId,
        threadId: thread.id,
        clientId: actor.id,
        freelancerId: gig.freelancerId,
        amountEtb,
        brief,
        // የራሳችን አገልግሎት ብሩ ሙሉ በሙሉ የድርጅቱ ስለሆነ ክፍያ አይቆረጥም።
        feePercent: gig.official ? 0 : TALENT_FEE_PERCENT,
      },
      select: { id: true },
    });
    await debit(tx, actor.id, amountEtb, "JOB_PAYMENT", { jobId: job.id });
    await systemNote(tx, thread.id, actor.id, "New job request. The payment is held safely by Ethio Computer.");
    return { jobId: job.id, threadId: thread.id };
  }, TX_OPTIONS);
}

type JobWho = { clientId?: string; freelancerId?: string };

async function moveJob(tx: Tx, jobId: string, who: JobWho, from: JobStatus[], data: Prisma.JobUpdateManyMutationInput) {
  const { count } = await tx.job.updateMany({ where: { id: jobId, ...who, status: { in: from } }, data });
  if (count !== 1) throw new DomainError("This job can't be changed this way right now.");
  return tx.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { threadId: true, clientId: true, freelancerId: true, amountEtb: true, feePercent: true, revisionCount: true, gig: { select: { deliveryDays: true } } },
  });
}

async function refund(tx: Tx, job: { clientId: string; amountEtb: number }, jobId: string) {
  await credit(tx, job.clientId, job.amountEtb, "JOB_REFUND", { jobId });
}

async function payFreelancer(tx: Tx, jobId: string, job: { freelancerId: string; amountEtb: number; feePercent: number }) {
  const { feeEtb, payoutEtb } = feeFor(job.amountEtb, job.feePercent);
  await tx.job.update({ where: { id: jobId }, data: { feeEtb, payoutEtb } });
  if (payoutEtb > 0) await credit(tx, job.freelancerId, payoutEtb, "JOB_EARNING", { jobId });
}

export async function acceptJob(actor: Actor, jobId: string) {
  await db.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: { id: jobId, freelancerId: actor.id }, select: { gig: { select: { deliveryDays: true } } } });
    if (!job) throw new DomainError("This job can't be changed this way right now.");
    const dueAt = new Date(Date.now() + job.gig.deliveryDays * 24 * 60 * 60 * 1000);
    const moved = await moveJob(tx, jobId, { freelancerId: actor.id }, ["REQUESTED"], { status: "IN_PROGRESS", dueAt });
    await systemNote(tx, moved.threadId, actor.id, "The pro accepted the job and started working.");
  }, TX_OPTIONS);
}

/** ባለሙያው ካልተቀበለው ወይም ደንበኛው ከመቀበሉ በፊት ከሰረዘው ብሩ ሙሉ በሙሉ ይመለሳል። */
export async function declineJob(actor: Actor, jobId: string) {
  await db.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: { id: jobId, OR: [{ freelancerId: actor.id }, { clientId: actor.id }] }, select: { clientId: true } });
    if (!job) throw new DomainError("This job can't be changed this way right now.");
    const byClient = job.clientId === actor.id;
    const moved = await moveJob(tx, jobId, byClient ? { clientId: actor.id } : { freelancerId: actor.id }, ["REQUESTED"], { status: "DECLINED" });
    await refund(tx, moved, jobId);
    await systemNote(
      tx,
      moved.threadId,
      actor.id,
      byClient ? "The client cancelled the request. The money was returned to their wallet." : "The pro declined the job. The money was returned to the client's wallet."
    );
  }, TX_OPTIONS);
}

export type DeliveryFile = { name: string; mimeType: string; data: Uint8Array<ArrayBuffer> };

export async function deliverJob(actor: Actor, jobId: string, note: string, files: DeliveryFile[]) {
  if (!note.trim() && files.length === 0) throw new DomainError("Add a file or a delivery link.");
  const job = await db.job.findFirst({ where: { id: jobId, freelancerId: actor.id }, select: { threadId: true } });
  if (!job) throw new DomainError("This job can't be changed this way right now.");
  // ትላልቅ ቪዲዮዎች በGoogle Drive ወዘተ ሊንክ ይላካሉ፤ ሌላ ሊንክ፣ ስልክ ወይም username አይፈቀድም።
  await guardText(actor, note, [], job.threadId, { allowedLinkHosts: DELIVERY_LINK_HOSTS });
  await db.$transaction(async (tx) => {
    const moved = await moveJob(tx, jobId, { freelancerId: actor.id }, ["IN_PROGRESS"], { status: "DELIVERED", deliveredAt: new Date(), deliveryNote: note });
    if (files.length > 0) await tx.jobFile.createMany({ data: files.map((file) => ({ ...file, jobId })) });
    await systemNote(tx, moved.threadId, actor.id, "The pro delivered the work. Check it and approve, or ask for changes.");
    if (note.trim()) await postMessage(tx, moved.threadId, actor.id, note, false);
  }, TX_OPTIONS);
}

export async function requestRevision(actor: Actor, jobId: string, note: string) {
  const job = await db.job.findFirst({ where: { id: jobId, clientId: actor.id }, select: { threadId: true } });
  if (!job) throw new DomainError("This job can't be changed this way right now.");
  await guardText(actor, note, [], job.threadId);
  await db.$transaction(async (tx) => {
    const moved = await moveJob(tx, jobId, { clientId: actor.id }, ["DELIVERED"], { status: "IN_PROGRESS", revisionCount: { increment: 1 } });
    await systemNote(tx, moved.threadId, actor.id, "The client asked for changes.");
    if (note.trim()) await postMessage(tx, moved.threadId, actor.id, note, false);
  }, TX_OPTIONS);
}

/** ደንበኛው ሲያጸድቅ ብሩ (ከድርጅቱ ክፍያ በኋላ) ወዲያውኑ ወደ ባለሙያው ዋሌት ይገባል። */
export async function approveJob(actor: Actor, jobId: string) {
  await db.$transaction(async (tx) => {
    const moved = await moveJob(tx, jobId, { clientId: actor.id }, ["DELIVERED"], { status: "COMPLETED", completedAt: new Date() });
    await payFreelancer(tx, jobId, moved);
    await systemNote(tx, moved.threadId, actor.id, "The client approved the work. The pro was paid.");
  }, TX_OPTIONS);
}

export async function openJobDispute(actor: Actor, jobId: string) {
  await db.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: { id: jobId, OR: [{ freelancerId: actor.id }, { clientId: actor.id }] }, select: { id: true } });
    if (!job) throw new DomainError("A dispute can't be opened for this job.");
    const { count } = await tx.job.updateMany({ where: { id: jobId, status: { in: ["IN_PROGRESS", "DELIVERED"] } }, data: { status: "DISPUTED" } });
    if (count !== 1) throw new DomainError("A dispute can't be opened for this job.");
    const moved = await tx.job.findUniqueOrThrow({ where: { id: jobId }, select: { threadId: true } });
    await systemNote(tx, moved.threadId, actor.id, "A dispute was opened. An Ethio Computer admin will read this chat and decide.");
  }, TX_OPTIONS);
}

/** አድሚኑ፦ ለባለሙያው መክፈል (release) ወይም ለደንበኛው መመለስ (refund)። */
export async function resolveJob(actor: Actor, jobId: string, decision: "release" | "refund") {
  assertAdmin(actor);
  await db.$transaction(async (tx) => {
    if (decision === "release") {
      const moved = await moveJob(tx, jobId, {}, ["IN_PROGRESS", "DELIVERED", "DISPUTED"], { status: "COMPLETED", completedAt: new Date() });
      await payFreelancer(tx, jobId, moved);
      await systemNote(tx, moved.threadId, actor.id, "An admin completed the job and paid the pro.");
    } else {
      const moved = await moveJob(tx, jobId, {}, ["REQUESTED", "IN_PROGRESS", "DELIVERED", "DISPUTED"], { status: "REFUNDED" });
      await refund(tx, moved, jobId);
      await systemNote(tx, moved.threadId, actor.id, "An admin refunded the client.");
    }
  }, TX_OPTIONS);
}

export async function reviewJob(actor: Actor, jobId: string, rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError("Check what you entered and try again.");
  assertPublicText(comment);
  const job = await db.job.findFirst({ where: { id: jobId, clientId: actor.id, status: "COMPLETED" }, select: { gigId: true, review: { select: { id: true } } } });
  if (!job) throw new DomainError("You can review a job after it's completed.");
  if (job.review) throw new DomainError("You already reviewed this job.");
  await db.jobReview.create({ data: { jobId, gigId: job.gigId, rating, comment } });
}
