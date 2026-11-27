// በኢትዮጵያ ብዙ ሰው የሚከፍላቸው ሰብስክሪፕሽኖች፦ አድሚኑ "ታዋቂዎቹን አስገባ" ሲጫን ይገባሉ (ያሉት አይደገሙም)።
// ዋጋዎቹ የአሜሪካ ዶላር መነሻ ዋጋዎች ናቸው፤ በየጊዜው ስለሚቀየሩ አድሚኑ አይቶ ማስተካከል አለበት።
import type { SubscriptionCategory, SubscriptionDelivery, SubscriptionInfo } from "@/lib/generated/prisma/enums";
import type { MessageKey } from "@/lib/messages";

export type SeedService = {
  name: string;
  category: SubscriptionCategory;
  description: MessageKey;
  requiredInfo: SubscriptionInfo;
  delivery?: SubscriptionDelivery;
  plans: { label: MessageKey; usd: number }[];
};

/** በስጦታ ኮድ/ቫውቸር የሚሸጡት (ኮድ ሲኖር ወዲያው ይሰጣሉ)። */
export const giftCodeServices = new Set(["Telegram Premium", "Discord Nitro", "Netflix", "Spotify Premium", "Apple Music", "iCloud+", "PlayStation Plus", "Xbox Game Pass Ultimate", "Surfshark VPN", "NordVPN", "Google One"]);

const month: MessageKey = "1 month";
const year: MessageKey = "1 year";

export const popularSubscriptions: SeedService[] = [
  // VPN
  { name: "Surfshark VPN", category: "VPN", requiredInfo: "EMAIL", description: "Fast VPN for unlimited devices.", plans: [{ label: month, usd: 15.45 }, { label: year, usd: 47.88 }] },
  { name: "NordVPN", category: "VPN", requiredInfo: "EMAIL", description: "Popular VPN with servers in many countries.", plans: [{ label: month, usd: 12.99 }, { label: year, usd: 59.88 }] },
  { name: "ExpressVPN", category: "VPN", requiredInfo: "EMAIL", description: "Simple, reliable VPN that works on every device.", plans: [{ label: month, usd: 12.95 }, { label: year, usd: 99.95 }] },
  { name: "Proton VPN Plus", category: "VPN", requiredInfo: "EMAIL", description: "Private VPN from the makers of Proton Mail.", plans: [{ label: month, usd: 9.99 }, { label: year, usd: 59.88 }] },

  // ሶሻል ሚዲያ
  {
    name: "Telegram Premium",
    category: "SOCIAL",
    requiredInfo: "USERNAME",
    description: "Bigger uploads, faster downloads, no ads and premium stickers. Sent as a gift to your username.",
    plans: [{ label: "3 months", usd: 13.99 }, { label: "6 months", usd: 18.99 }, { label: year, usd: 35.99 }],
  },
  { name: "Meta Verified (Facebook & Instagram)", category: "SOCIAL", requiredInfo: "EMAIL", description: "The blue badge, account protection and direct support from Meta.", plans: [{ label: month, usd: 14.99 }] },
  { name: "X Premium", category: "SOCIAL", requiredInfo: "USERNAME", description: "Checkmark, longer posts and fewer ads on X (Twitter).", plans: [{ label: month, usd: 8 }, { label: year, usd: 84 }] },
  { name: "Snapchat+", category: "SOCIAL", requiredInfo: "USERNAME", description: "Exclusive Snapchat features and early access.", plans: [{ label: month, usd: 3.99 }, { label: year, usd: 29.99 }] },
  { name: "LinkedIn Premium", category: "SOCIAL", requiredInfo: "EMAIL", description: "See who viewed your profile and message recruiters.", plans: [{ label: month, usd: 29.99 }] },
  { name: "Discord Nitro", category: "SOCIAL", requiredInfo: "USERNAME", description: "HD streaming, bigger uploads and custom emoji on Discord.", plans: [{ label: month, usd: 9.99 }, { label: year, usd: 99.99 }] },

  // AI
  { name: "ChatGPT Plus", category: "AI", requiredInfo: "EMAIL", description: "OpenAI's best models, image making and more use.", plans: [{ label: month, usd: 20 }] },
  { name: "Claude Pro", category: "AI", requiredInfo: "EMAIL", description: "More use of Claude by Anthropic for writing, research and code.", plans: [{ label: month, usd: 20 }] },
  { name: "Google AI Pro (Gemini)", category: "AI", requiredInfo: "EMAIL", description: "Gemini's advanced models plus 2TB of Google storage.", plans: [{ label: month, usd: 19.99 }] },
  { name: "Perplexity Pro", category: "AI", requiredInfo: "EMAIL", description: "AI search with sources and the best models.", plans: [{ label: month, usd: 20 }] },
  { name: "Midjourney", category: "AI", requiredInfo: "EMAIL", description: "Create beautiful images from text.", plans: [{ label: month, usd: 10 }] },
  { name: "GitHub Copilot", category: "AI", requiredInfo: "USERNAME", description: "AI that helps you write code faster.", plans: [{ label: month, usd: 10 }, { label: year, usd: 100 }] },
  { name: "Cursor Pro", category: "AI", requiredInfo: "EMAIL", description: "AI code editor for developers.", plans: [{ label: month, usd: 20 }] },

  // ፊልምና ሙዚቃ
  { name: "Netflix", category: "STREAMING", requiredInfo: "EMAIL", description: "Movies and series on your TV and phone.", plans: [{ label: month, usd: 17.99 }] },
  { name: "YouTube Premium", category: "STREAMING", requiredInfo: "EMAIL", description: "YouTube without ads, background play and YouTube Music.", plans: [{ label: month, usd: 13.99 }] },
  { name: "Spotify Premium", category: "STREAMING", requiredInfo: "EMAIL", description: "Music without ads, offline listening and any song you want.", plans: [{ label: month, usd: 11.99 }] },
  { name: "Apple Music", category: "STREAMING", requiredInfo: "EMAIL", description: "Millions of songs on your iPhone and other devices.", plans: [{ label: month, usd: 10.99 }] },
  { name: "Amazon Prime Video", category: "STREAMING", requiredInfo: "EMAIL", description: "Amazon's movies, series and sports.", plans: [{ label: month, usd: 8.99 }] },
  { name: "Disney+", category: "STREAMING", requiredInfo: "EMAIL", description: "Disney, Pixar, Marvel and Star Wars.", plans: [{ label: month, usd: 9.99 }] },

  // ዲዛይንና ኤዲቲንግ
  { name: "Canva Pro", category: "CREATIVE", requiredInfo: "EMAIL", description: "Premium templates, background remover and brand kits.", plans: [{ label: month, usd: 15 }, { label: year, usd: 120 }] },
  { name: "CapCut Pro", category: "CREATIVE", requiredInfo: "EMAIL", description: "Pro effects, no watermark and cloud space for your videos.", plans: [{ label: month, usd: 9.99 }, { label: year, usd: 89.99 }] },
  { name: "Adobe Creative Cloud", category: "CREATIVE", requiredInfo: "EMAIL", description: "Photoshop, Premiere Pro, After Effects and more.", plans: [{ label: month, usd: 59.99 }] },
  { name: "Adobe Photoshop", category: "CREATIVE", requiredInfo: "EMAIL", description: "The best tool for photos and thumbnails.", plans: [{ label: month, usd: 22.99 }] },
  { name: "Envato Elements", category: "CREATIVE", requiredInfo: "EMAIL", description: "Unlimited templates, music, fonts and stock video.", plans: [{ label: month, usd: 16.5 }] },
  { name: "Freepik Premium", category: "CREATIVE", requiredInfo: "EMAIL", description: "Premium photos, icons and vectors.", plans: [{ label: month, usd: 12 }] },
  { name: "Epidemic Sound", category: "CREATIVE", requiredInfo: "EMAIL", description: "Copyright-safe music for YouTube and TikTok.", plans: [{ label: month, usd: 17.99 }] },

  // ክላውድና ቢሮ
  { name: "Google One", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "More storage for Gmail, Drive and Photos.", plans: [{ label: "100 GB · 1 month", usd: 1.99 }, { label: "2 TB · 1 month", usd: 9.99 }] },
  { name: "iCloud+", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "More storage for your iPhone photos and backups.", plans: [{ label: "200 GB · 1 month", usd: 2.99 }, { label: "2 TB · 1 month", usd: 9.99 }] },
  { name: "Microsoft 365", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "Word, Excel, PowerPoint and 1TB OneDrive.", plans: [{ label: month, usd: 9.99 }, { label: year, usd: 99.99 }] },
  { name: "Zoom Pro", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "Long meetings and cloud recording.", plans: [{ label: month, usd: 15.99 }] },
  { name: "Grammarly Pro", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "Write clear, correct English.", plans: [{ label: month, usd: 30 }] },
  { name: "Duolingo Super", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "Learn languages without ads or limits.", plans: [{ label: month, usd: 12.99 }] },
  { name: "Coursera Plus", category: "PRODUCTIVITY", requiredInfo: "EMAIL", description: "Thousands of courses and certificates.", plans: [{ label: month, usd: 59 }] },

  // ጌሚንግ
  { name: "PlayStation Plus", category: "GAMING", requiredInfo: "EMAIL", description: "Online play and monthly games on PlayStation.", plans: [{ label: month, usd: 9.99 }] },
  { name: "Xbox Game Pass Ultimate", category: "GAMING", requiredInfo: "EMAIL", description: "Hundreds of games on Xbox and PC.", plans: [{ label: month, usd: 29.99 }] },

  // ዴቨሎፐር
  { name: "Apple Developer Program", category: "DEVELOPER", requiredInfo: "EMAIL", description: "Publish your apps on the App Store.", plans: [{ label: year, usd: 99 }] },
  { name: "Google Play Console", category: "DEVELOPER", requiredInfo: "EMAIL", description: "Publish your apps on Google Play. Paid once.", plans: [{ label: "One-time", usd: 25 }] },
];
