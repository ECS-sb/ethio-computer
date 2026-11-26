import "server-only";
import { db } from "@/lib/db";
import type { ProductCategory } from "@/lib/generated/prisma/client";
import { publicSellerName } from "@/lib/queries";
import type { CurrentUser } from "@/lib/session";
import { OFFICIAL_SELLER_NAME } from "@/lib/talent-catalog";

/** የኢትዮ ኮምፒውተር እቃ በድርጅቱ ስም ይታያል፤ የሌሎች በአጭር ስማቸው። */
function sellerName(official: boolean, name: string) {
  return official ? OFFICIAL_SELLER_NAME : publicSellerName(name);
}

const cardSelect = {
  id: true,
  category: true,
  condition: true,
  title: true,
  brand: true,
  priceEtb: true,
  city: true,
  official: true,
  sellerId: true,
  createdAt: true,
  seller: { select: { name: true, verifiedSeller: true } },
  images: { orderBy: { position: "asc" }, take: 1, select: { id: true, width: true, height: true } },
} as const;

type CardRow = { official: boolean; seller: { name: string; verifiedSeller: boolean }; images: { id: string; width: number; height: number }[] };

function toCard<T extends CardRow>(row: T) {
  const { seller, images, ...rest } = row;
  return { ...rest, sellerName: sellerName(row.official, seller.name), verified: row.official || seller.verifiedSeller, cover: images[0] ?? null };
}

export async function getPublicProducts(filter: { category?: ProductCategory; q?: string }) {
  const q = filter.q?.trim();
  const rows = await db.product.findMany({
    where: {
      status: "APPROVED",
      seller: { suspended: false },
      ...(filter.category ? { category: filter.category } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ official: "desc" }, { createdAt: "desc" }],
    take: 90,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export type ProductCard = Awaited<ReturnType<typeof getPublicProducts>>[number];

/** ያልጸደቀ ወይም የተሸጠ እቃ የሚታየው ለሻጩ፣ ለገዢዎቹና ለአድሚኑ ብቻ ነው። */
export async function getProductForViewer(id: string, viewer: CurrentUser | null) {
  const product = await db.product.findUnique({
    where: { id },
    select: {
      ...cardSelect,
      description: true,
      status: true,
      rejectReason: true,
      seller: { select: { name: true, verifiedSeller: true, suspended: true, createdAt: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, width: true, height: true } },
    },
  });
  if (!product) return null;
  const isOwner = viewer?.id === product.sellerId;
  const thread = viewer && !isOwner ? await db.productThread.findUnique({ where: { productId_buyerId: { productId: id, buyerId: viewer.id } }, select: { id: true } }) : null;
  const isPublic = product.status === "APPROVED" && !product.seller.suspended;
  if (!isPublic && !isOwner && !thread && !viewer?.isAdmin) return null;
  const sold = await db.productOrder.count({ where: { sellerId: product.sellerId, status: "COMPLETED" } });
  return {
    product: {
      ...toCard(product),
      description: product.description,
      status: product.status,
      rejectReason: product.rejectReason,
      images: product.images,
      memberSince: product.seller.createdAt,
    },
    isOwner,
    threadId: thread?.id ?? null,
    sellerSales: sold,
  };
}

export async function getMyProducts(userId: string) {
  const rows = await db.product.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" },
    select: { ...cardSelect, status: true, rejectReason: true, _count: { select: { threads: true } } },
  });
  return rows.map((row) => ({ ...toCard(row), status: row.status, rejectReason: row.rejectReason, chats: row._count.threads }));
}

/** የተጠቃሚው የኤሌክትሮኒክስ ቻቶች (እንደ ገዢም እንደ ሻጭም)፣ ከመጨረሻው መልዕክትና ከትዕዛዙ ሁኔታ ጋር። */
export async function getMyDeals(userId: string) {
  const rows = await db.productThread.findMany({
    where: { OR: [{ buyerId: userId }, { product: { sellerId: userId } }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      buyerId: true,
      updatedAt: true,
      buyer: { select: { name: true } },
      product: { select: { title: true, official: true, seller: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, system: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amountEtb: true } },
    },
  });
  return rows.map((row) => {
    const asBuyer = row.buyerId === userId;
    return {
      id: row.id,
      asBuyer,
      title: row.product.title,
      otherName: asBuyer ? sellerName(row.product.official, row.product.seller.name) : publicSellerName(row.buyer.name),
      lastMessage: row.messages[0] ?? null,
      order: row.orders[0] ?? null,
      updatedAt: row.updatedAt,
    };
  });
}

const orderSelect = {
  id: true,
  amountEtb: true,
  status: true,
  feePercent: true,
  payoutEtb: true,
  handedOverAt: true,
  createdAt: true,
} as const;

export async function getDeal(id: string, userId: string) {
  const row = await db.productThread.findFirst({
    where: { id, OR: [{ buyerId: userId }, { product: { sellerId: userId } }] },
    select: {
      id: true,
      buyerId: true,
      buyer: { select: { name: true } },
      product: {
        select: {
          id: true,
          title: true,
          priceEtb: true,
          status: true,
          city: true,
          official: true,
          sellerId: true,
          seller: { select: { name: true } },
          images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 300, select: { id: true, senderId: true, body: true, system: true, createdAt: true } },
      orders: { orderBy: { createdAt: "desc" }, select: orderSelect },
    },
  });
  if (!row) return null;
  const asBuyer = row.buyerId === userId;
  return {
    id: row.id,
    asBuyer,
    product: row.product,
    otherName: asBuyer ? sellerName(row.product.official, row.product.seller.name) : publicSellerName(row.buyer.name),
    messages: row.messages,
    orders: row.orders,
  };
}

export type DealOrder = NonNullable<Awaited<ReturnType<typeof getDeal>>>["orders"][number];

// ---- ፎቶዎች

/** የሚሸጥ እቃ ፎቶ ለሁሉም ይታያል፤ ያልጸደቀው ለሻጩ፣ ለገዢዎቹና ለአድሚኑ ብቻ። */
export async function getProductImageFile(id: string, variant: "full" | "thumb", viewer: () => Promise<CurrentUser | null>) {
  const image = await db.productImage.findUnique({
    where: { id },
    select: {
      data: variant === "full",
      thumb: variant === "thumb",
      product: { select: { id: true, status: true, sellerId: true, seller: { select: { suspended: true } } } },
    },
  });
  if (!image) return null;
  const isPublic = ["APPROVED", "RESERVED", "SOLD"].includes(image.product.status) && !image.product.seller.suspended;
  if (!isPublic) {
    const user = await viewer();
    if (!user) return null;
    const allowed =
      user.isAdmin ||
      user.id === image.product.sellerId ||
      (await db.productThread.count({ where: { productId: image.product.id, buyerId: user.id } })) > 0;
    if (!allowed) return null;
  }
  const bytes = variant === "thumb" ? image.thumb : image.data;
  if (!bytes) return null;
  return { bytes, isPublic };
}

// ---- አድሚን (ጥሪዎቹ ከrequireStaff በኋላ ብቻ ይደረጋሉ)

export async function getPendingProducts() {
  return db.product.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      condition: true,
      title: true,
      brand: true,
      description: true,
      priceEtb: true,
      city: true,
      createdAt: true,
      seller: { select: { name: true, email: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, width: true, height: true } },
    },
  });
}

export async function getAdminProductOrders() {
  return db.productOrder.findMany({
    where: { status: { in: ["PAID", "HANDED_OVER", "DISPUTED"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      threadId: true,
      amountEtb: true,
      status: true,
      createdAt: true,
      product: { select: { title: true } },
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
    },
  });
}

/** አለመግባባት ሲኖር አድሚኑ ቻቱን ያነባል። */
export async function getDealForAdmin(id: string) {
  return db.productThread.findUnique({
    where: { id },
    select: {
      id: true,
      buyerId: true,
      buyer: { select: { name: true } },
      product: { select: { id: true, title: true, sellerId: true, seller: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 500, select: { id: true, senderId: true, body: true, system: true, createdAt: true } },
      orders: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, amountEtb: true } },
    },
  });
}
