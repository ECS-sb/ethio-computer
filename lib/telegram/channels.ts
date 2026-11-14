// የሚሸጡ ቻናሎች፦ ሊንኩን ወደ አንድ ቅርጽ መቀየር (የሻጩና የገዢው ቻት በዚህ ይገናኛሉ) እና የትርፍ ስሌት። ምንም database አይጠቀምም።

export type ChannelStatus = "NEGOTIATING" | "AGREED" | "PAID" | "DELIVERED" | "REFUNDED" | "CANCELLED";

const STATUS_RANK: Record<ChannelStatus, number> = { CANCELLED: 0, NEGOTIATING: 1, AGREED: 2, PAID: 3, DELIVERED: 4, REFUNDED: 4 };

export function statusRank(status: ChannelStatus | null | undefined): number {
  return status ? STATUS_RANK[status] : -1;
}

const PLATFORM_SLUGS: [RegExp, string][] = [
  [/you\s?tube|yt/i, "youtube"],
  [/tik\s?tok/i, "tiktok"],
  [/insta/i, "instagram"],
  [/face\s?book|^fb$/i, "facebook"],
  [/telegram/i, "telegram"],
  [/twitter|^x$/i, "x"],
  [/adsense/i, "adsense"],
];

export function platformSlug(platform: string): string {
  for (const [pattern, slug] of PLATFORM_SLUGS) if (pattern.test(platform.trim())) return slug;
  return platform.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "other";
}

const HOSTS: [RegExp, string][] = [
  [/^(?:www\.|m\.|music\.)?youtube\.com$/, "youtube"],
  [/^(?:www\.|m\.|vm\.|vt\.)?tiktok\.com$/, "tiktok"],
  [/^(?:www\.)?instagram\.com$/, "instagram"],
  [/^(?:www\.|m\.|web\.|mbasic\.)?(?:facebook|fb)\.com$/, "facebook"],
  [/^(?:t|telegram)\.me$/, "telegram"],
  [/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/, "x"],
];

const NOT_A_PROFILE = new Set(["watch", "shorts", "live", "playlist", "results", "p", "reel", "reels", "stories", "explore", "share", "story.php", "photo", "photo.php", "video", "videos", "joinchat", "s"]);

function fromUrl(raw: string): string | null {
  const match = raw.match(/((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
  if (!match) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(match[1]) ? match[1] : `https://${match[1]}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const site = HOSTS.find(([pattern]) => pattern.test(host))?.[1];
  if (!site) return null;
  const [first = "", second = ""] = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part).toLowerCase());
  if (!first) return null;
  if (site === "facebook" && first === "profile.php") {
    const id = url.searchParams.get("id");
    return id ? `facebook:id/${id}` : null;
  }
  if (site === "youtube" && ["channel", "c", "user"].includes(first)) return second ? `youtube:${first}/${second}` : null;
  if (site === "facebook" && ["groups", "pages"].includes(first)) return second ? `facebook:${first}/${second}` : null;
  // የቲክቶክ አጭር ሊንኮች (vm.tiktok.com/…) ወደ ማን እንደሚሄዱ አይታወቅም፤ ቢያንስ ተመሳሳዩ ሊንክ ይገናኛል።
  if (site === "tiktok" && /^v[mt]\./.test(host)) return `tiktok:short/${first}`;
  if (site === "telegram" && first.startsWith("+")) return `telegram:${first}`;
  if (NOT_A_PROFILE.has(first)) return null;
  return `${site}:@${first.replace(/^@/, "")}`;
}

/**
 * የቻናሉን ሊንክ ወይም @username ወደ አንድ ቅርጽ ይቀይራል፦ "https://www.tiktok.com/@Abebe?lang=en" እና "@abebe" (TikTok) ሁለቱም "tiktok:@abebe" ይሆናሉ።
 * ቻናሉን የማይለይ ሊንክ (ለምሳሌ የአንድ ቪዲዮ ሊንክ) ወይም ባዶ ሲሆን null ይመለሳል።
 */
export function channelKey(platform: string, value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const url = fromUrl(raw);
  if (url) return url;
  const handle = raw.match(/^@?([A-Za-z0-9_.]{3,64})$/);
  if (!handle || /^\d+$/.test(handle[1])) return null;
  return `${platformSlug(platform)}:@${handle[1].toLowerCase()}`;
}

export type ChannelMoneyInput = {
  purchasePrice: number | null;
  paidToSellerEtb: number | null;
  salePrice: number | null;
  buyerPaidEtb: number | null;
  refundedEtb: number;
  saleStatus: ChannelStatus | null;
};

/**
 * አንድ ቻናል ያስገኘው ገቢና ትርፍ። የሚቆጠረው ገዢው ከከፈለ በኋላ ብቻ ነው።
 * ተመላሽ ብር ከገቢውም ከትርፉም ይቀነሳል፤ ሙሉ በሙሉ የተመለሰ (REFUNDED) ሽያጭ ገቢውም ትርፉም ዜሮ ይሆናል።
 * የተገዛበት ዋጋ ካልታወቀ ትርፉ null ነው (missingCost)።
 */
export function channelMoney(channel: ChannelMoneyInput) {
  const refundedAll = channel.saleStatus === "REFUNDED";
  const realized = channel.saleStatus === "PAID" || channel.saleStatus === "DELIVERED" || refundedAll;
  if (!realized) return { realized, paid: 0, refunded: 0, revenue: 0, cost: 0, profit: null, missingCost: false };
  const paid = channel.buyerPaidEtb ?? channel.salePrice ?? 0;
  const refunded = refundedAll ? Math.max(channel.refundedEtb, paid) : Math.min(channel.refundedEtb, paid);
  const revenue = paid - refunded;
  const knownCost = channel.paidToSellerEtb ?? channel.purchasePrice;
  const missingCost = !refundedAll && knownCost === null;
  const cost = refundedAll ? 0 : (knownCost ?? 0);
  return { realized, paid, refunded, revenue, cost, profit: missingCost ? null : revenue - cost, missingCost };
}

export function summarizeChannels(channels: ChannelMoneyInput[]) {
  const totals = { sold: 0, refundedSales: 0, paid: 0, refunded: 0, revenue: 0, cost: 0, profit: 0, missingCost: 0 };
  for (const channel of channels) {
    const money = channelMoney(channel);
    if (!money.realized) continue;
    if (channel.saleStatus === "REFUNDED") totals.refundedSales += 1;
    else totals.sold += 1;
    totals.paid += money.paid;
    totals.refunded += money.refunded;
    totals.revenue += money.revenue;
    totals.cost += money.cost;
    if (money.profit === null) totals.missingCost += 1;
    else totals.profit += money.profit;
  }
  return totals;
}
