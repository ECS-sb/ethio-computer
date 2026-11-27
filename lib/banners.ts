import "server-only";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/marketplace";
import { DomainError } from "@/lib/marketplace-errors";

/** በዋናው ገጽ ላይ የሚታዩ ባነሮች (ቅናሽ፣ ዜና)፦ የበሩ፣ የጀመሩ እና ያላለቁ ብቻ፣ አዲሱ ከላይ። */
export async function getActiveBanners(now = new Date()) {
  return db.banner.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, titleEn: true, titleAm: true, textEn: true, textAm: true, linkUrl: true, linkLabelEn: true, linkLabelAm: true, code: true, endsAt: true },
  });
}

export async function getAllBanners() {
  return db.banner.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export type BannerInput = {
  titleEn: string;
  titleAm: string;
  textEn: string;
  textAm: string;
  linkUrl: string | null;
  linkLabelEn: string;
  linkLabelAm: string;
  code: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

function assertAdmin(actor: Actor) {
  if (!actor.isAdmin) throw new DomainError("You don't have permission to do this.");
}

function check(input: BannerInput) {
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new DomainError("The end must be after the start.");
}

export async function createBanner(actor: Actor, input: BannerInput) {
  assertAdmin(actor);
  check(input);
  await db.banner.create({ data: input });
}

export async function updateBanner(actor: Actor, id: string, input: BannerInput) {
  assertAdmin(actor);
  check(input);
  await db.banner.update({ where: { id }, data: input });
}

export async function setBannerActive(actor: Actor, id: string, active: boolean) {
  assertAdmin(actor);
  await db.banner.update({ where: { id }, data: { active } });
}

export async function deleteBanner(actor: Actor, id: string) {
  assertAdmin(actor);
  await db.banner.delete({ where: { id } });
}
