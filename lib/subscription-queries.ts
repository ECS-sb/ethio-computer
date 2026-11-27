import "server-only";
import { db } from "@/lib/db";
import { planPriceEtb, subscriptionCategories, type PriceSettings } from "@/lib/subscription-catalog";
import { getPriceSettings } from "@/lib/subscriptions";

const serviceSelect = {
  id: true,
  name: true,
  category: true,
  description: true,
  requiredInfo: true,
  plans: { where: { active: true }, orderBy: { position: "asc" }, select: { id: true, label: true, usdCents: true, priceEtb: true } },
} as const;

type ServiceRow = { plans: { id: string; label: string; usdCents: number; priceEtb: number | null }[] };

/** ዋጋ የሌላቸው እቅዶች (ተመኑ ገና ካልተቀመጠ) አይታዩም፤ እቅድ የሌለው አገልግሎትም አይታይም። */
function priced<T extends ServiceRow>(service: T, settings: PriceSettings) {
  const { plans: raw, ...rest } = service;
  const plans = raw.flatMap((plan) => {
    const price = planPriceEtb(plan, settings);
    return price ? [{ id: plan.id, label: plan.label, price }] : [];
  });
  return { ...rest, plans };
}

export async function getSubscriptionStore() {
  const [rows, settings] = await Promise.all([
    db.subscriptionService.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }], select: serviceSelect }),
    getPriceSettings(),
  ]);
  const services = rows.map((row) => priced(row, settings)).filter((service) => service.plans.length > 0);
  return subscriptionCategories
    .map((category) => ({ ...category, services: services.filter((service) => service.category === category.value) }))
    .filter((category) => category.services.length > 0);
}

export type StoreService = Awaited<ReturnType<typeof getSubscriptionStore>>[number]["services"][number];

export async function getStoreService(id: string) {
  const [row, settings] = await Promise.all([db.subscriptionService.findFirst({ where: { id, active: true }, select: serviceSelect }), getPriceSettings()]);
  if (!row) return null;
  const service = priced(row, settings);
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
  return db.subscriptionService.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      requiredInfo: true,
      active: true,
      plans: { orderBy: { position: "asc" }, select: { id: true, label: true, usdCents: true, priceEtb: true, active: true } },
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
