import "server-only";
import { db } from "@/lib/db";
import type { Prisma, TelegramChannel } from "@/lib/generated/prisma/client";
import type { ChatAnalysis } from "@/lib/telegram/ai";
import { channelKey, platformSlug, statusRank, type ChannelStatus } from "@/lib/telegram/channels";

type AiChannel = ChatAnalysis["channels"][number];
type Side = "seller" | "buyer";

const REALIZED = new Set<ChannelStatus>(["PAID", "DELIVERED", "REFUNDED"]);
const SELLER_FIELDS = ["purchasePrice", "paidToSellerEtb", "sourceStatus"] as const;
const BUYER_FIELDS = ["salePrice", "buyerPaidEtb", "refundedEtb", "saleStatus"] as const;
export const EDITABLE_FIELDS = ["title", ...SELLER_FIELDS, ...BUYER_FIELDS] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

const money = (value: number | null | undefined) => (typeof value === "number" && value > 0 && value < 1_000_000_000 ? Math.round(value) : null);
const chatField = (side: Side) => (side === "seller" ? "sellerChatId" : "buyerChatId");
const otherChatField = (side: Side) => (side === "seller" ? "buyerChatId" : "sellerChatId");

/** AI ያገኘውን የአንድ ወገን (ሻጭ ወይም ገዢ) መረጃ ወደ መስኮች ይቀይራል፤ ሰራተኛ የቆለፋቸውን አይነካም። */
function sideData(side: Side, chatId: string, item: AiChannel, at: Date, row: TelegramChannel | null): Prisma.TelegramChannelUncheckedUpdateInput {
  const locked = new Set(row?.lockedFields ?? []);
  const data: Prisma.TelegramChannelUncheckedUpdateInput = {};
  const set = <K extends EditableField>(field: K, value: Prisma.TelegramChannelUncheckedUpdateInput[K]) => {
    if (!locked.has(field)) (data as Record<string, unknown>)[field] = value;
  };
  const agreed = money(item.agreed_price_etb);
  const paid = money(item.paid_etb);
  const refunded = money(item.refunded_etb) ?? 0;
  if (side === "seller") {
    data.sellerChatId = chatId;
    set("purchasePrice", agreed);
    set("paidToSellerEtb", paid === null ? null : Math.max(0, paid - refunded));
    set("sourceStatus", item.status);
    // የሻጩ መግለጫ (ተከታዮች፣ ርዕስ) ብዙውን ጊዜ የተሟላ ነው።
    if (item.description.trim()) set("title", item.description.trim().slice(0, 200));
  } else {
    data.buyerChatId = chatId;
    set("salePrice", agreed);
    set("buyerPaidEtb", paid);
    set("refundedEtb", refunded);
    set("saleStatus", item.status);
    if (!locked.has("saleStatus")) data.soldAt = REALIZED.has(item.status) ? (row?.soldAt ?? at) : null;
    if (item.description.trim() && (!row || row.title === row.platform)) set("title", item.description.trim().slice(0, 200));
  }
  if (!row || at > row.lastActivityAt) data.lastActivityAt = at;
  return data;
}

/** በዚህ ቻት ሊንኩ ያልተጻፈ ቻናል ሌላኛው ቻት ላይ በሊንኩ ካለ፣ የዚህን ወገን መረጃ ወደዚያ ያዛውራል። */
async function moveSideOnto(keyed: TelegramChannel, row: TelegramChannel, side: Side): Promise<TelegramChannel> {
  const field = chatField(side);
  if (row[otherChatField(side)] || (keyed[field] && keyed[field] !== row[field])) return row;
  const fields = side === "seller" ? SELLER_FIELDS : BUYER_FIELDS;
  const moved = Object.fromEntries(fields.map((name) => [name, row[name]]));
  const [, updated] = await db.$transaction([
    db.telegramChannel.delete({ where: { id: row.id } }),
    db.telegramChannel.update({
      where: { id: keyed.id },
      data: { ...moved, [field]: row[field], lockedFields: [...new Set([...keyed.lockedFields, ...row.lockedFields])] },
    }),
  ]);
  return updated;
}

/**
 * የአንድ ቻት ትንተና ውስጥ የተገኙትን ቻናሎች ያስቀምጣል። ተመሳሳዩ ቻናል (በሊንኩ) በሻጩም በገዢውም ቻት ከተጠቀሰ አንድ መዝገብ ይሆናል፤
 * ትርፉ የሚሰላው ከዚህ ነው። ሊንኩ ያልተጻፈባቸውን ሰራተኛ በእጅ ያገናኛቸዋል።
 */
export async function syncChatChannels(chatId: string, items: AiChannel[], messages: { sentAt: Date }[]) {
  if (messages.length === 0) return;
  const windowStart = messages[0].sentAt;
  const lastAt = messages[messages.length - 1].sentAt;
  const existing = await db.telegramChannel.findMany({ where: { OR: [{ sellerChatId: chatId }, { buyerChatId: chatId }] } });
  const touched = new Set<string>();

  for (const item of items) {
    const side: Side = item.side === "SELLER_SELLS_TO_US" ? "seller" : "buyer";
    const field = chatField(side);
    const key = channelKey(item.platform, item.link_or_handle);
    const evidence = item.evidence_message_numbers.map((number) => messages[number - 1]).filter((message) => message !== undefined);
    const at = evidence.reduce((latest, message) => (message.sentAt > latest ? message.sentAt : latest), evidence[0]?.sentAt ?? lastAt);

    const mine = existing.filter((channel) => channel[field] === chatId && !touched.has(channel.id));
    let row =
      (key ? mine.find((channel) => channel.key === key) : undefined) ??
      mine.find((channel) => !channel.key && platformSlug(channel.platform) === platformSlug(item.platform)) ??
      null;
    const keyed = key ? await db.telegramChannel.findUnique({ where: { key } }) : null;
    if (keyed && row && keyed.id !== row.id) {
      row = await moveSideOnto(keyed, row, side);
    } else if (keyed && !row) {
      const current = keyed[field];
      const currentStatus = side === "seller" ? keyed.sourceStatus : keyed.saleStatus;
      // ሌላ ሰው በዚህ ቻናል ከፍሎ ወይም የበለጠ ሄዶ ከሆነ አይተካም (ለምሳሌ ሁለት ገዢዎች ስለ አንድ ቻናል ሲጠይቁ)።
      if (current && current !== chatId && (statusRank(currentStatus) >= 3 || statusRank(item.status) <= statusRank(currentStatus))) continue;
      row = keyed;
    }

    const data = sideData(side, chatId, item, at, row);
    if (row) {
      const link = key && !row.link ? item.link_or_handle.trim().slice(0, 300) : undefined;
      const canTakeKey = key && !row.key && !(await db.telegramChannel.findUnique({ where: { key }, select: { id: true } }));
      const saved = await db.telegramChannel.update({ where: { id: row.id }, data: { ...data, ...(link ? { link } : {}), ...(canTakeKey ? { key } : {}) } });
      touched.add(saved.id);
    } else {
      const created = await db.telegramChannel.create({
        data: {
          ...(data as Prisma.TelegramChannelUncheckedCreateInput),
          platform: item.platform.trim().slice(0, 40) || "Other",
          title: item.description.trim().slice(0, 200) || item.platform.trim() || "Channel",
          key,
          link: key ? item.link_or_handle.trim().slice(0, 300) : null,
          lastActivityAt: at,
        },
      });
      touched.add(created.id);
    }
  }

  // AI ቀደም ብሎ ያገኛቸውና አሁን ያልተጠቀሱ፣ ሌላ ወገን ያልተገናኘባቸው እና በሰራተኛ ያልተነኩ መዝገቦች ይሰረዛሉ (በዚህ ትንተና ውስጥ ባሉት መልዕክቶች ጊዜ ብቻ)።
  const stale = existing.filter(
    (channel) =>
      !touched.has(channel.id) &&
      channel.lockedFields.length === 0 &&
      channel.lastActivityAt >= windowStart &&
      (channel.sellerChatId === chatId) !== (channel.buyerChatId === chatId) &&
      !(channel.sellerChatId && channel.buyerChatId)
  );
  if (stale.length > 0) await db.telegramChannel.deleteMany({ where: { id: { in: stale.map((channel) => channel.id) } } });
}

// ---- ሰራተኛ በእጅ የሚያደርጋቸው ለውጦች (ሁሉም የተቀየሩትን መስኮች ይቆልፋሉ፤ AI ከዚያ በኋላ አይቀይራቸውም)

export type ChannelEdit = {
  title: string;
  purchasePrice: number | null;
  paidToSellerEtb: number | null;
  sourceStatus: ChannelStatus | null;
  salePrice: number | null;
  buyerPaidEtb: number | null;
  refundedEtb: number;
  saleStatus: ChannelStatus | null;
};

export async function editChannel(id: string, edit: ChannelEdit) {
  const row = await db.telegramChannel.findUniqueOrThrow({ where: { id } });
  const changed = EDITABLE_FIELDS.filter((field) => edit[field] !== row[field]);
  if (changed.length === 0) return;
  const saleRealized = edit.saleStatus !== null && REALIZED.has(edit.saleStatus);
  await db.telegramChannel.update({
    where: { id },
    data: {
      ...Object.fromEntries(changed.map((field) => [field, edit[field]])),
      ...(changed.includes("saleStatus") ? { soldAt: saleRealized ? (row.soldAt ?? new Date()) : null } : {}),
      lockedFields: [...new Set([...row.lockedFields, ...changed])],
    },
  });
}

/** የገዢውን ቻናል ከሻጩ ቻናል ጋር ያገናኛል (ሁለቱ መዝገቦች አንድ ይሆናሉ)። */
export async function linkChannels(firstId: string, secondId: string) {
  const [first, second] = await Promise.all([
    db.telegramChannel.findUniqueOrThrow({ where: { id: firstId } }),
    db.telegramChannel.findUniqueOrThrow({ where: { id: secondId } }),
  ]);
  const buyer = first.buyerChatId && !first.sellerChatId ? first : second;
  const seller = buyer === first ? second : first;
  if (!buyer.buyerChatId || buyer.sellerChatId || !seller.sellerChatId || seller.buyerChatId) throw new Error("Only a buyer-only and a seller-only channel can be linked.");
  const key = buyer.key ?? seller.key;
  await db.$transaction([
    db.telegramChannel.delete({ where: { id: seller.id } }),
    db.telegramChannel.update({
      where: { id: buyer.id },
      data: {
        sellerChatId: seller.sellerChatId,
        purchasePrice: seller.purchasePrice,
        paidToSellerEtb: seller.paidToSellerEtb,
        sourceStatus: seller.sourceStatus,
        title: seller.title || buyer.title,
        key,
        link: buyer.link ?? seller.link,
        lastActivityAt: seller.lastActivityAt > buyer.lastActivityAt ? seller.lastActivityAt : buyer.lastActivityAt,
        lockedFields: [...new Set([...buyer.lockedFields, ...seller.lockedFields, "linked"])],
      },
    }),
  ]);
}

/** በስህተት የተገናኙትን ይለያያል፦ የሻጩ ወገን አዲስ መዝገብ ይሆናል። */
export async function unlinkChannel(id: string) {
  const row = await db.telegramChannel.findUniqueOrThrow({ where: { id } });
  if (!row.sellerChatId || !row.buyerChatId) return;
  await db.$transaction([
    db.telegramChannel.create({
      data: {
        platform: row.platform,
        title: row.title,
        sellerChatId: row.sellerChatId,
        purchasePrice: row.purchasePrice,
        paidToSellerEtb: row.paidToSellerEtb,
        sourceStatus: row.sourceStatus,
        lastActivityAt: row.lastActivityAt,
        lockedFields: ["linked"],
      },
    }),
    db.telegramChannel.update({
      where: { id },
      data: { sellerChatId: null, purchasePrice: null, paidToSellerEtb: null, sourceStatus: null, lockedFields: [...new Set([...row.lockedFields, "linked"])] },
    }),
  ]);
}

export async function addChannel(chatId: string, side: Side, input: { platform: string; title: string; link: string; price: number | null }) {
  const key = channelKey(input.platform, input.link);
  if (key && (await db.telegramChannel.findUnique({ where: { key }, select: { id: true } }))) throw new Error("A channel with this link already exists.");
  const priceField = side === "seller" ? "purchasePrice" : "salePrice";
  const data = {
    platform: input.platform,
    title: input.title || input.platform,
    key,
    link: key ? input.link.trim() : null,
    [chatField(side)]: chatId,
    [priceField]: input.price,
    [side === "seller" ? "sourceStatus" : "saleStatus"]: "NEGOTIATING",
    lastActivityAt: new Date(),
    lockedFields: ["title", priceField, "manual"],
  } as Prisma.TelegramChannelUncheckedCreateInput;
  await db.telegramChannel.create({ data });
}

export async function deleteChannel(id: string) {
  await db.telegramChannel.delete({ where: { id } });
}
