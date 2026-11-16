// ለሙከራ፦ ከሁሉም ፕላትፎርሞች ናሙና ማስታወቂያዎችን (ከስክሪንሾት ምስሎች ጋር) ያስገባል ወይም ያጠፋል።
//   npx tsx scripts/seed-samples.ts                 → ሙከራ ብቻ፤ ምስሎቹን ወደ .samples-preview/ ይጽፋል፣ ዳታቤዙን አይነካም
//   npx tsx scripts/seed-samples.ts --apply         → ዳታቤዙ ላይ ያስገባል (በ.env.local ያለው DATABASE_URL)
//   npx tsx scripts/seed-samples.ts --remove        → ያስገባቸውን ናሙናዎች ያጠፋል
// ናሙናዎቹ በአንድ "Ethio Computer Samples" ሻጭ ስር ይገባሉ፤ መግለጫቸው ናሙና መሆናቸውን ይናገራል።

import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { Pool } from "pg";
import sharp from "sharp";
import { PrismaClient } from "@/lib/generated/prisma/client";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const SAMPLE_SELLER = { id: "sample-seller", email: "samples@ethiomarket.test", name: "Ethio Computer Samples" };
const NOTE = "Sample listing for testing — not a real account.\nለሙከራ የቀረበ ናሙና ነው፤ እውነተኛ አካውንት አይደለም።";

type Sample = {
  platform: "instagram" | "tiktok" | "youtube" | "telegram" | "facebook" | "x";
  username: string;
  followers: number;
  posts: number;
  priceEtb: number;
  category: string;
  country: string;
  engagement: number;
  femaleShare: number;
  joinedYear: number;
  monetized?: boolean;
  strikeFree?: boolean;
  description: string;
};

const samples: Sample[] = [
  { platform: "instagram", username: "addis_food_daily", followers: 48200, posts: 612, priceEtb: 38000, category: "food", country: "ET", engagement: 4.1, femaleShare: 58, joinedYear: 2020, description: "Ethiopian food recipes and restaurant reviews in Addis." },
  { platform: "instagram", username: "habesha_style_hub", followers: 126500, posts: 1450, priceEtb: 95000, category: "fashion", country: "ET", engagement: 3.2, femaleShare: 71, joinedYear: 2019, description: "Habesha fashion, traditional dresses and modern styling." },
  { platform: "tiktok", username: "ethio_comedy_tube", followers: 215000, posts: 380, priceEtb: 92000, category: "entertainment", country: "ET", engagement: 8.6, femaleShare: 44, joinedYear: 2021, description: "Short Amharic comedy sketches with a young audience." },
  { platform: "tiktok", username: "fitness_with_abel", followers: 64800, posts: 210, priceEtb: 41000, category: "fitness", country: "US", engagement: 6.3, femaleShare: 39, joinedYear: 2022, description: "Home workouts and fitness tips, mostly diaspora viewers." },
  { platform: "youtube", username: "ethio_tech_review", followers: 86400, posts: 245, priceEtb: 145000, category: "tech", country: "ET", engagement: 5.4, femaleShare: 18, joinedYear: 2018, monetized: true, strikeFree: true, description: "Phone and gadget reviews in Amharic. Monetized, no strikes." },
  { platform: "youtube", username: "learn_english_amharic", followers: 31200, posts: 120, priceEtb: 52000, category: "education", country: "ET", engagement: 7.1, femaleShare: 47, joinedYear: 2020, monetized: true, strikeFree: true, description: "English lessons explained in Amharic for beginners." },
  { platform: "telegram", username: "addis_jobs_board", followers: 54000, posts: 3900, priceEtb: 46000, category: "business", country: "ET", engagement: 12.5, femaleShare: 41, joinedYear: 2019, description: "Daily job vacancies in Addis Ababa. Very active members." },
  { platform: "telegram", username: "ethio_music_drop", followers: 22800, posts: 2100, priceEtb: 18000, category: "music", country: "ET", engagement: 9.8, femaleShare: 49, joinedYear: 2021, description: "New Ethiopian music releases shared every day." },
  { platform: "facebook", username: "ethio_travel_guide", followers: 98000, posts: 870, priceEtb: 60000, category: "travel", country: "ET", engagement: 2.7, femaleShare: 46, joinedYear: 2017, description: "Travel spots, hotels and tours across Ethiopia." },
  { platform: "facebook", username: "dubai_habesha_community", followers: 41500, posts: 520, priceEtb: 33000, category: "lifestyle", country: "AE", engagement: 3.9, femaleShare: 62, joinedYear: 2018, description: "Community page for Ethiopians living in Dubai." },
  { platform: "x", username: "ethio_business_news", followers: 27300, posts: 6400, priceEtb: 29000, category: "business", country: "ET", engagement: 1.9, femaleShare: 27, joinedYear: 2016, description: "Business and economy news from Ethiopia." },
  { platform: "x", username: "afro_tech_daily", followers: 15600, posts: 3800, priceEtb: 14000, category: "tech", country: "US", engagement: 2.4, femaleShare: 22, joinedYear: 2019, description: "African tech startups and product news." },
];

const PLATFORM_LOOK: Record<Sample["platform"], { name: string; color: string; unit: string }> = {
  instagram: { name: "Instagram", color: "#E1306C", unit: "Followers" },
  tiktok: { name: "TikTok", color: "#25F4EE", unit: "Followers" },
  youtube: { name: "YouTube Studio", color: "#FF0033", unit: "Subscribers" },
  telegram: { name: "Telegram", color: "#2AABEE", unit: "Members" },
  facebook: { name: "Facebook", color: "#1877F2", unit: "Followers" },
  x: { name: "X", color: "#E7E9EA", unit: "Followers" },
};

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** የመተግበሪያ ትንታኔ የሚመስል ስክሪንሾት፤ የአካውንቱ ስም ተደብቋል (የገበያው ደንብ)፣ "SAMPLE" ምልክት አለው። */
function screenshotSvg(sample: Sample, variant: number): string {
  const look = PLATFORM_LOOK[sample.platform];
  const bars = Array.from({ length: 12 }, (_, index) => 30 + ((index * 37 + variant * 53 + sample.followers) % 70) + index * 6);
  const stats =
    variant === 0
      ? [
          [look.unit, compact(sample.followers)],
          ["Posts", compact(sample.posts)],
          ["Engagement", `${sample.engagement}%`],
          ["Women", `${sample.femaleShare}%`],
        ]
      : [
          ["Views (28d)", compact(Math.round(sample.followers * 3.4))],
          ["Reach", compact(Math.round(sample.followers * 1.8))],
          ["New " + look.unit.toLowerCase(), `+${compact(Math.round(sample.followers * 0.04))}`],
          ["Since", String(sample.joinedYear)],
        ];
  const tiles = stats
    .map(([label, value], index) => {
      const x = 60 + (index % 2) * 400;
      const y = 470 + Math.floor(index / 2) * 190;
      return `<rect x="${x}" y="${y}" width="380" height="170" rx="24" fill="#1b1b1b"/>
        <text x="${x + 30}" y="${y + 55}" fill="#9a9a9a" font-size="30" font-family="Arial, sans-serif">${label}</text>
        <text x="${x + 30}" y="${y + 125}" fill="#f2f2f2" font-size="60" font-weight="700" font-family="Arial, sans-serif">${value}</text>`;
    })
    .join("");
  const chart = bars.map((height, index) => `<rect x="${70 + index * 66}" y="${1250 - height * 2.4}" width="44" height="${height * 2.4}" rx="8" fill="${look.color}" opacity="0.85"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">
    <rect width="900" height="1400" fill="#0b0b0b"/>
    <rect x="0" y="0" width="900" height="120" fill="#141414"/>
    <text x="60" y="78" fill="${look.color}" font-size="42" font-weight="700" font-family="Arial, sans-serif">${look.name}</text>
    <circle cx="140" cy="260" r="80" fill="#262626"/>
    <rect x="250" y="210" width="360" height="40" rx="20" fill="#2a2a2a"/>
    <rect x="250" y="275" width="240" height="30" rx="15" fill="#222"/>
    <text x="60" y="420" fill="#f2f2f2" font-size="40" font-weight="700" font-family="Arial, sans-serif">${variant === 0 ? "Profile overview" : "Analytics · last 28 days"}</text>
    ${tiles}
    <text x="60" y="910" fill="#9a9a9a" font-size="30" font-family="Arial, sans-serif">Growth</text>
    ${chart}
    <text x="450" y="1360" text-anchor="middle" fill="#ffbe1a" font-size="34" font-weight="700" font-family="Arial, sans-serif" opacity="0.9">SAMPLE · ETHIO COMPUTER</text>
  </svg>`;
}

async function images(sample: Sample) {
  return Promise.all(
    [0, 1].map(async (variant) => {
      const svg = Buffer.from(screenshotSvg(sample, variant));
      const full = await sharp(svg).resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const thumb = await sharp(svg).resize({ width: 640 }).webp({ quality: 70 }).toBuffer();
      return { data: new Uint8Array(full.data), thumb: new Uint8Array(thumb), width: full.info.width, height: full.info.height, position: variant };
    })
  );
}

async function preview() {
  const dir = path.resolve(".samples-preview");
  fs.mkdirSync(dir, { recursive: true });
  for (const sample of samples) {
    const [first, second] = await images(sample);
    fs.writeFileSync(path.join(dir, `${sample.platform}-${sample.username}-1.webp`), first.data);
    fs.writeFileSync(path.join(dir, `${sample.platform}-${sample.username}-2.webp`), second.data);
  }
  console.log(`Dry run: wrote ${samples.length * 2} screenshots to ${dir}. Nothing was written to the database.`);
  console.log("Run with --apply to add the samples, or --remove to delete them.");
}

function client() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (.env.local).");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function apply() {
  const db = client();
  await db.user.upsert({
    where: { id: SAMPLE_SELLER.id },
    create: { ...SAMPLE_SELLER, emailVerified: true, verifiedSeller: true },
    update: { verifiedSeller: true },
  });
  let added = 0;
  for (const sample of samples) {
    const exists = await db.listing.findFirst({ where: { platform: sample.platform, username: sample.username, status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] } }, select: { id: true } });
    if (exists) continue;
    await db.listing.create({
      data: {
        sellerId: SAMPLE_SELLER.id,
        platform: sample.platform,
        username: sample.username,
        followers: sample.followers,
        posts: sample.posts,
        priceEtb: sample.priceEtb,
        category: sample.category,
        country: sample.country,
        engagement: sample.engagement,
        femaleShare: sample.femaleShare,
        joinedYear: sample.joinedYear,
        monetized: sample.monetized ?? false,
        strikeFree: sample.strikeFree ?? false,
        description: `${sample.description}\n\n${NOTE}`,
        verificationCode: `EM-${randomInt(100000, 1000000)}`,
        status: "APPROVED",
        images: { create: await images(sample) },
      },
    });
    added++;
  }
  console.log(`Added ${added} sample listings (${samples.length - added} were already there).`);
  await db.$disconnect();
}

async function remove() {
  const db = client();
  // ትዕዛዝ ያላቸው ናሙናዎች (ሙከራ የተገዙ) ታሪካቸው እንዳይጠፋ በማህደር ይቀመጣሉ፤ ሌሎቹ ይጠፋሉ።
  const withOrders = await db.listing.updateMany({ where: { sellerId: SAMPLE_SELLER.id, orders: { some: {} } }, data: { status: "ARCHIVED" } });
  const deleted = await db.listing.deleteMany({ where: { sellerId: SAMPLE_SELLER.id, orders: { none: {} } } });
  const left = await db.listing.count({ where: { sellerId: SAMPLE_SELLER.id } });
  if (left === 0) await db.user.deleteMany({ where: { id: SAMPLE_SELLER.id } });
  console.log(`Deleted ${deleted.count} sample listings, archived ${withOrders.count} that have orders.`);
  await db.$disconnect();
}

const mode = process.argv.includes("--apply") ? apply : process.argv.includes("--remove") ? remove : preview;
mode().catch((error) => {
  console.error(error);
  process.exit(1);
});
