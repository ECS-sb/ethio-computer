import "server-only";
import { db } from "@/lib/db";
import type { GigCategory } from "@/lib/generated/prisma/client";
import { publicSellerName } from "@/lib/queries";
import type { CurrentUser } from "@/lib/session";
import { OFFICIAL_SELLER_NAME } from "@/lib/talent-catalog";

/** የኢትዮ ኮምፒውተር አገልግሎት በድርጅቱ ስም ይታያል፤ የሌሎች በአጭር ስማቸው። */
function sellerName(official: boolean, name: string) {
  return official ? OFFICIAL_SELLER_NAME : publicSellerName(name);
}

/** የአገልግሎቶቹ አማካይ ደረጃ እና የአስተያየቶች ብዛት። */
async function ratingsFor(gigIds: string[]) {
  if (gigIds.length === 0) return new Map<string, { average: number; count: number }>();
  const rows = await db.jobReview.groupBy({ by: ["gigId"], where: { gigId: { in: gigIds } }, _avg: { rating: true }, _count: { _all: true } });
  return new Map(rows.map((row) => [row.gigId, { average: row._avg.rating ?? 0, count: row._count._all }]));
}

async function completedJobsFor(freelancerIds: string[]) {
  if (freelancerIds.length === 0) return new Map<string, number>();
  const rows = await db.job.groupBy({ by: ["freelancerId"], where: { freelancerId: { in: freelancerIds }, status: "COMPLETED" }, _count: { _all: true } });
  return new Map(rows.map((row) => [row.freelancerId, row._count._all]));
}

const cardSelect = {
  id: true,
  category: true,
  title: true,
  priceEtb: true,
  deliveryDays: true,
  freelancerId: true,
  official: true,
  freelancer: { select: { name: true, verifiedSeller: true } },
  samples: { orderBy: { position: "asc" }, select: { id: true, kind: true, width: true, height: true } },
} as const;

export async function getPublicGigs(category?: GigCategory) {
  const rows = await db.gig.findMany({
    where: { status: "APPROVED", freelancer: { suspended: false }, ...(category ? { category } : {}) },
    orderBy: [{ official: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: cardSelect,
  });
  const [ratings, completed] = await Promise.all([ratingsFor(rows.map((row) => row.id)), completedJobsFor([...new Set(rows.map((row) => row.freelancerId))])]);
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    priceEtb: row.priceEtb,
    deliveryDays: row.deliveryDays,
    freelancerName: sellerName(row.official, row.freelancer.name),
    official: row.official,
    verified: row.official || row.freelancer.verifiedSeller,
    cover: row.samples.find((sample) => sample.kind === "image") ?? null,
    hasAudio: row.samples.some((sample) => sample.kind === "audio"),
    rating: ratings.get(row.id) ?? null,
    completedJobs: completed.get(row.freelancerId) ?? 0,
  }));
}

export type GigCard = Awaited<ReturnType<typeof getPublicGigs>>[number];

/** ያልጸደቀ አገልግሎት የሚታየው ለባለቤቱና ለአድሚኑ ብቻ ነው። */
export async function getGigForViewer(id: string, viewer: CurrentUser | null) {
  const gig = await db.gig.findUnique({
    where: { id },
    select: {
      ...cardSelect,
      description: true,
      portfolioLinks: true,
      status: true,
      rejectReason: true,
      createdAt: true,
      freelancer: { select: { name: true, verifiedSeller: true, suspended: true, createdAt: true } },
    },
  });
  if (!gig) return null;
  const isOwner = viewer?.id === gig.freelancerId;
  const isPublic = gig.status === "APPROVED" && !gig.freelancer.suspended;
  if (!isPublic && !isOwner && !viewer?.isAdmin) return null;

  const [ratings, completed, reviews, thread] = await Promise.all([
    ratingsFor([gig.id]),
    completedJobsFor([gig.freelancerId]),
    db.jobReview.findMany({
      where: { gigId: gig.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, rating: true, comment: true, createdAt: true, job: { select: { client: { select: { name: true } } } } },
    }),
    viewer && !isOwner ? db.gigThread.findUnique({ where: { gigId_clientId: { gigId: gig.id, clientId: viewer.id } }, select: { id: true } }) : null,
  ]);
  return {
    gig: {
      id: gig.id,
      category: gig.category,
      title: gig.title,
      description: gig.description,
      priceEtb: gig.priceEtb,
      deliveryDays: gig.deliveryDays,
      portfolioLinks: gig.portfolioLinks,
      status: gig.status,
      rejectReason: gig.rejectReason,
      images: gig.samples.filter((sample) => sample.kind === "image").map((sample) => ({ id: sample.id, width: sample.width ?? 800, height: sample.height ?? 600 })),
      audios: gig.samples.filter((sample) => sample.kind === "audio").map((sample) => ({ id: sample.id })),
      freelancerName: sellerName(gig.official, gig.freelancer.name),
      official: gig.official,
      verified: gig.official || gig.freelancer.verifiedSeller,
      memberSince: gig.freelancer.createdAt,
    },
    isOwner,
    threadId: thread?.id ?? null,
    rating: ratings.get(gig.id) ?? null,
    completedJobs: completed.get(gig.freelancerId) ?? 0,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      clientName: publicSellerName(review.job.client.name),
    })),
  };
}

export async function getMyGigs(userId: string) {
  const rows = await db.gig.findMany({
    where: { freelancerId: userId },
    orderBy: { createdAt: "desc" },
    select: { ...cardSelect, status: true, rejectReason: true, _count: { select: { jobs: true } } },
  });
  const ratings = await ratingsFor(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, rating: ratings.get(row.id) ?? null }));
}

/** የተጠቃሚው ቻቶች (እንደ ደንበኛም እንደ ባለሙያም)፣ ከመጨረሻው መልዕክትና ከስራው ሁኔታ ጋር። */
export async function getMyThreads(userId: string) {
  const rows = await db.gigThread.findMany({
    where: { OR: [{ clientId: userId }, { gig: { freelancerId: userId } }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      clientId: true,
      updatedAt: true,
      client: { select: { name: true } },
      gig: { select: { title: true, category: true, freelancerId: true, official: true, freelancer: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, system: true } },
      jobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amountEtb: true } },
    },
  });
  return rows.map((row) => {
    const asClient = row.clientId === userId;
    return {
      id: row.id,
      asClient,
      title: row.gig.title,
      category: row.gig.category,
      otherName: asClient ? sellerName(row.gig.official, row.gig.freelancer.name) : publicSellerName(row.client.name),
      lastMessage: row.messages[0] ?? null,
      job: row.jobs[0] ?? null,
      updatedAt: row.updatedAt,
    };
  });
}

export async function getThread(id: string, userId: string) {
  const row = await db.gigThread.findFirst({
    where: { id, OR: [{ clientId: userId }, { gig: { freelancerId: userId } }] },
    select: {
      id: true,
      clientId: true,
      client: { select: { name: true } },
      gig: { select: { id: true, title: true, category: true, priceEtb: true, deliveryDays: true, status: true, freelancerId: true, official: true, freelancer: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, select: { id: true, senderId: true, body: true, system: true, createdAt: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountEtb: true,
          brief: true,
          status: true,
          feePercent: true,
          payoutEtb: true,
          dueAt: true,
          deliveredAt: true,
          deliveryNote: true,
          revisionCount: true,
          createdAt: true,
          files: { select: { id: true, name: true, mimeType: true } },
          review: { select: { rating: true, comment: true } },
        },
      },
    },
  });
  if (!row) return null;
  const asClient = row.clientId === userId;
  return {
    id: row.id,
    asClient,
    gig: row.gig,
    otherName: asClient ? sellerName(row.gig.official, row.gig.freelancer.name) : publicSellerName(row.client.name),
    messages: row.messages,
    jobs: row.jobs,
  };
}

export type ThreadJob = NonNullable<Awaited<ReturnType<typeof getThread>>>["jobs"][number];

// ---- ፋይሎች

/** የጸደቀ አገልግሎት ናሙና ለሁሉም ይታያል፤ ያልጸደቀው ለባለቤቱና ለአድሚኑ ብቻ። */
export async function getGigSampleFile(id: string, variant: "full" | "thumb", viewer: () => Promise<CurrentUser | null>) {
  const sample = await db.gigSample.findUnique({
    where: { id },
    select: { kind: true, mimeType: true, data: variant === "full", thumb: variant === "thumb", gig: { select: { status: true, freelancerId: true, freelancer: { select: { suspended: true } } } } },
  });
  if (!sample) return null;
  const isPublic = sample.gig.status === "APPROVED" && !sample.gig.freelancer.suspended;
  if (!isPublic) {
    const user = await viewer();
    if (!user || (user.id !== sample.gig.freelancerId && !user.isAdmin)) return null;
  }
  const bytes = variant === "thumb" && sample.kind === "image" ? sample.thumb : sample.data;
  if (!bytes) return null;
  return { bytes, mimeType: sample.kind === "image" ? "image/webp" : sample.mimeType, isPublic };
}

/** የተረከበው ስራ ፋይል፦ ደንበኛው፣ ባለሙያው እና አድሚኑ ብቻ። */
export async function getJobFile(id: string, user: CurrentUser) {
  const file = await db.jobFile.findUnique({
    where: { id },
    select: { name: true, mimeType: true, data: true, job: { select: { clientId: true, freelancerId: true } } },
  });
  if (!file) return null;
  if (file.job.clientId !== user.id && file.job.freelancerId !== user.id && !user.isAdmin) return null;
  return file;
}

// ---- አድሚን (ጥሪዎቹ ከrequireStaff በኋላ ብቻ ይደረጋሉ)

export async function getPendingGigs() {
  return db.gig.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      priceEtb: true,
      deliveryDays: true,
      portfolioLinks: true,
      createdAt: true,
      freelancer: { select: { name: true, email: true } },
      samples: { orderBy: { position: "asc" }, select: { id: true, kind: true, width: true, height: true } },
    },
  });
}

export async function getAdminJobs() {
  return db.job.findMany({
    where: { status: { in: ["REQUESTED", "IN_PROGRESS", "DELIVERED", "DISPUTED"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      threadId: true,
      amountEtb: true,
      brief: true,
      status: true,
      feePercent: true,
      createdAt: true,
      dueAt: true,
      gig: { select: { title: true, category: true } },
      client: { select: { name: true, email: true } },
      freelancer: { select: { name: true, email: true } },
    },
  });
}

/** አለመግባባት ሲኖር አድሚኑ ቻቱን ያነባል። */
export async function getThreadForAdmin(id: string) {
  return db.gigThread.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
      client: { select: { name: true } },
      gig: { select: { title: true, freelancerId: true, freelancer: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 500, select: { id: true, senderId: true, body: true, system: true, createdAt: true } },
      jobs: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, amountEtb: true, brief: true, deliveryNote: true, files: { select: { id: true, name: true } } } },
    },
  });
}
