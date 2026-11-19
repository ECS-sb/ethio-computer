// የ"ባለሙያ ቅጠሩ" ቋሚ መረጃዎች (ምድቦች፣ ሁኔታዎች፣ ገደቦች)። ምንም database አይጠቀምም፤ በclient ኮምፖነንቶችም ይሰራል።
import type { GigCategory, GigStatus, JobStatus } from "@/lib/generated/prisma/enums";
import { am, type MessageKey } from "@/lib/messages";

export const gigCategories: { value: GigCategory; label: MessageKey; hint: MessageKey; mark: string }[] = [
  { value: "VOICE_OVER", label: "Voice-over", hint: "Narration for videos, ads and audiobooks in Amharic or English.", mark: "VO" },
  { value: "THUMBNAIL", label: "Thumbnail design", hint: "Eye-catching YouTube and TikTok thumbnails.", mark: "TH" },
  { value: "VIDEO_EDITING", label: "Video editing", hint: "Cutting, captions, music and effects for your videos.", mark: "ED" },
  { value: "AI_VIDEO", label: "AI video", hint: "Videos made with AI generators, from script to final clip.", mark: "AI" },
];

export function gigCategory(value: string) {
  return gigCategories.find((category) => category.value === value);
}

export const gigStatusLabels: Record<GigStatus, MessageKey> = {
  PENDING: "Under review",
  APPROVED: "Live",
  REJECTED: "Rejected",
  PAUSED: "Paused",
};

export const jobStatusLabels: Record<JobStatus, MessageKey> = {
  REQUESTED: "Waiting for the pro to accept",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered, waiting for approval",
  COMPLETED: "Completed",
  DISPUTED: "In dispute",
  DECLINED: "Declined, money returned",
  REFUNDED: "Refunded",
};

/** ደረጃዎቹ በገጹ ላይ በቅደም ተከተል ይታያሉ (የተሰረዙት እዚህ የሉም)። */
export const jobStages: JobStatus[] = ["REQUESTED", "IN_PROGRESS", "DELIVERED", "COMPLETED"];

/** የድርጅቱ ክፍያ ከባለሙያው ገቢ ላይ ይቆረጣል፤ ደንበኛው የተስማማውን ዋጋ ብቻ ይከፍላል። */
export const TALENT_FEE_PERCENT = 10;

export const talentSteps: { title: MessageKey; description: MessageKey }[] = [
  { title: "Pick a pro", description: "Compare portfolios, prices and reviews, and ask questions in the chat." },
  { title: "Hire and pay safely", description: "Your money is held by Ethio Computer. The pro starts when they accept." },
  { title: "Get your work", description: "The pro delivers on the site. Ask for changes if something isn't right." },
  { title: "Approve and review", description: "When you approve, the pro gets paid. Then leave a review for others." },
];

// Vercel ጥያቄን እስከ 4.5MB ብቻ ይቀበላል።
export const MAX_GIG_IMAGES = 4;
export const MAX_GIG_IMAGE_BYTES = 1_000_000;
export const MAX_GIG_AUDIO = 2;
export const MAX_GIG_AUDIO_BYTES = 1_500_000;
export const MAX_JOB_FILES = 3;
export const MAX_JOB_FILE_BYTES = 4_000_000;
export const MAX_PORTFOLIO_LINKS = 4;

export const AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"];

/** በፖርትፎሊዮና ስራ ማስረከቢያ ላይ የሚፈቀዱ የሊንክ አድራሻዎች (ትላልቅ ቪዲዮዎች ስለማይጫኑ)። ሌላ ሊንክ በቻት ጥበቃው ይያዛል። */
export const PORTFOLIO_LINK_HOSTS = ["youtube.com", "youtu.be", "drive.google.com"] as const;
export const DELIVERY_LINK_HOSTS = ["drive.google.com", "docs.google.com", "youtube.com", "youtu.be", "dropbox.com", "wetransfer.com", "we.tl"] as const;

/** የሲስተም መልዕክቶች በdatabase ውስጥ እንደ ቁልፍ ይቀመጣሉ፤ የማይታወቅ ቁልፍ ከመጣ ጽሑፉ እንዳለ ይታያል። */
export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(am, value);
}

export const ratingOptions: { value: string; label: MessageKey }[] = [
  { value: "5", label: "5 stars: excellent" },
  { value: "4", label: "4 stars: good" },
  { value: "3", label: "3 stars: okay" },
  { value: "2", label: "2 stars: poor" },
  { value: "1", label: "1 star: bad" },
];
