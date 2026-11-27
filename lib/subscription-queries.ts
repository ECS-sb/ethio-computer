import "server-only";
import { db } from "@/lib/db";
import { discountActive, planPricing, subscriptionCategories, type PriceSettings, type ServicePricing } from "@/lib/subscription-catalog";
import { getPriceSettings } from "@/lib/subscriptions";

const serviceSelect = {
  id: true,
  name: true,
  category: true,
  description: true,
  requiredInfo: true,
  delivery: true,
  profitEtb: true,
  discountPercent: true,
  discountEtb: true,
  discountEndsAt: true,
  updatedAt: true,
  plans: {
    where: { active: true },
    orderBy: { position: "asc" },
    select: { id: true, label: true, usdCents: true, priceEtb: true, _count: { select: { codes: { where: { orderId: null } } } } },
  },
} as const;

type ServiceRow = ServicePricing & {
  delivery: "CODE" | "ACCOUNT";
  plans: { id: string; label: string; usdCents: number; priceEtb: number | null; _count: { codes: number } }[];
};

/**
 * ዋጋ የሌላቸው እቅዶች (ተመኑ ገና ካልተቀመጠ) አይታዩም፤ እቅድ የሌለው አገልግሎትም አይታይም።
 * instant፦ በስጦታ ኮድ የሚሰጥ እና ኮድ በክምችት ያለው (ደንበኛው እንደከፈለ ያገኘዋል)።
 */
function priced<T extends ServiceRow>(service: T, settings: PriceSettings, now: Date) {
  const { plans: raw, ...rest } = service;
  const plans = raw.flatMap((plan) => {
    const pricing = planPricing(plan, settings, service, now);
    return pricing ? [{ id: plan.id, label: plan.label, price: pricing.price, before: pricing.before, instant: service.delivery === "CODE" && plan._count.codes > 0 }] : [];
  });
  return { ...rest, plans, onSale: discountActive(service, now), instant: plans.some((plan) => plan.instant) };
}

/** የሰቀሉት ሎጎ ያላቸው አገልግሎቶች (ምስሉ ራሱ አይጫንም)፤ አድራሻው በupdatedAt ይቀየራል። */
async function uploadedLogos() {
  const rows = await db.subscriptionService.findMany({ where: { logo: { not: null } }, select: { id: true, updatedAt: true } });
  return new Map(rows.map((row) => [row.id, `/api/subscription-logos/${row.id}?v=${row.updatedAt.getTime()}`]));
}

export async function getSubscriptionStore() {
  const now = new Date();
  const [rows, settings, logos] = await Promise.all([
    db.subscriptionService.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }], select: serviceSelect }),
    getPriceSettings(),
    uploadedLogos(),
  ]);
  const services = rows
    .map((row) => ({ ...priced(row, settings, now), logoUrl: logos.get(row.id) ?? null }))
    .filter((service) => service.plans.length > 0);
  return subscriptionCategories
    .map((category) => ({ ...category, services: services.filter((service) => service.category === category.value) }))
    .filter((category) => category.services.length > 0);
}

export type StoreService = Awaited<ReturnType<typeof getSubscriptionStore>>[number]["services"][number];

export async function getStoreService(id: string) {
  const now = new Date();
  const [row, settings, logos] = await Promise.all([db.subscriptionService.findFirst({ where: { id, active: true }, select: serviceSelect }), getPriceSettings(), uploadedLogos()]);
  if (!row) return null;
  const service = { ...priced(row, settings, now), logoUrl: logos.get(row.id) ?? null };
  return service.plans.length > 0 ? service : null;
}

export async function getMySubscriptionOrders(userId: string) {
  return db.subscriptionOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, serviceName: true, planLabel: true, amountEtb: true, status: true, payMethod: true, createdAt: true },
  });
}

export async function getMySubscriptionOrder(id: string, userId: string) {
  return db.subscriptionOrder.findFirst({
    where: { id, userId },
    select: {
      id: true,
      serviceName: true,
      planLabel: true,
      amountEtb: true,
      accountInfo: true,
      note: true,
      status: true,
      payMethod: true,
      deliveryNote: true,
      paidAt: true,
      deliveredAt: true,
      createdAt: true,
    },
  });
}

// ---- አድሚን (ጥሪዎቹ ከrequireStaff በኋላ ብቻ ይደረጋሉ)

export async function getSubscriptionQueue() {
  return db.subscriptionOrder.findMany({
    where: { status: { in: ["PAID", "DELIVERED", "REFUNDED"] } },
    orderBy: [{ status: "asc" }, { paidAt: "desc" }],
    take: 80,
    select: {
      id: true,
      serviceName: true,
      planLabel: true,
      amountEtb: true,
      accountInfo: true,
      note: true,
      status: true,
      payMethod: true,
      deliveryNote: true,
      paidAt: true,
      deliveredAt: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });
}

export async function getSubscriptionCatalogForAdmin() {
  const [rows, logos] = await Promise.all([getCatalogRows(), uploadedLogos()]);
  return rows.map((row) => ({ ...row, logoUrl: logos.get(row.id) ?? null }));
}

function getCatalogRows() {
  return db.subscriptionService.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      requiredInfo: true,
      active: true,
      delivery: true,
      profitEtb: true,
      discountPercent: true,
      discountEtb: true,
      discountEndsAt: true,
      updatedAt: true,
      plans: {
        orderBy: { position: "asc" },
        select: { id: true, label: true, usdCents: true, priceEtb: true, active: true, _count: { select: { codes: { where: { orderId: null } } } } },
      },
    },
  });
}

export async function getSubscriptionStats() {
  const [paid, waiting] = await Promise.all([
    db.subscriptionOrder.aggregate({ where: { status: { in: ["PAID", "DELIVERED"] } }, _sum: { amountEtb: true }, _count: { _all: true } }),
    db.subscriptionOrder.count({ where: { status: "PAID" } }),
  ]);
  return { orders: paid._count._all, revenueEtb: paid._sum.amountEtb ?? 0, waiting };
}
