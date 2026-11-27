import {
  siApple,
  siApplemusic,
  siClaude,
  siCoursera,
  siCursor,
  siDiscord,
  siDuolingo,
  siEnvato,
  siExpressvpn,
  siFreepik,
  siGithubcopilot,
  siGoogle,
  siGooglegemini,
  siGoogleplay,
  siGrammarly,
  siIcloud,
  siMeta,
  siNetflix,
  siNordvpn,
  siPerplexity,
  siPlaystation,
  siProtonvpn,
  siSnapchat,
  siSpotify,
  siSurfshark,
  siTelegram,
  siX,
  siYoutube,
  siZoom,
  type SimpleIcon,
} from "simple-icons";
import Image from "next/image";
import { legacyLogos } from "@/lib/legacy-logos";
import { serviceMark } from "@/lib/subscription-catalog";
import { cn } from "@/lib/utils";

/**
 * የአገልግሎቱ ሎጎ በቅደም ተከተል፦ አድሚኑ የሰቀለው ምስል → simple-icons (CC0) → የቆየው simple-icons ስሪት → በብራንድ ቀለሙ ላይ የስሙ ፊደላት።
 * በአድሚኑ የተጨመረ አዲስ አገልግሎት ሎጎ እስኪሰቀልለት ፊደላቱን በወርቃማው ቀለም ያሳያል።
 */
const icons: Record<string, SimpleIcon> = {
  "Surfshark VPN": siSurfshark,
  NordVPN: siNordvpn,
  ExpressVPN: siExpressvpn,
  "Proton VPN Plus": siProtonvpn,
  "Telegram Premium": siTelegram,
  "Meta Verified (Facebook & Instagram)": siMeta,
  "X Premium": siX,
  "Snapchat+": siSnapchat,
  "Discord Nitro": siDiscord,
  "Claude Pro": siClaude,
  "Google AI Pro (Gemini)": siGooglegemini,
  "Perplexity Pro": siPerplexity,
  "GitHub Copilot": siGithubcopilot,
  "Cursor Pro": siCursor,
  Netflix: siNetflix,
  "YouTube Premium": siYoutube,
  "Spotify Premium": siSpotify,
  "Apple Music": siApplemusic,
  "Envato Elements": siEnvato,
  "Freepik Premium": siFreepik,
  "Google One": siGoogle,
  "iCloud+": siIcloud,
  "Zoom Pro": siZoom,
  "Grammarly Pro": siGrammarly,
  "Duolingo Super": siDuolingo,
  "Coursera Plus": siCoursera,
  "PlayStation Plus": siPlaystation,
  "Apple Developer Program": siApple,
  "Google Play Console": siGoogleplay,
};

/** ሎጎ የሌላቸው ብራንዶች ቀለም (ፊደላቱ በዚህ ቀለም ላይ ይታያሉ)። */
const brandColors: Record<string, string> = {
  Midjourney: "#000000",
  "Disney+": "#113CCF",
  "CapCut Pro": "#000000",
  "Epidemic Sound": "#000000",
};

/** ጥቁር ሎጎዎች በጨለማው ገጽታ እንዳይጠፉ በጽሑፉ ቀለም ይታያሉ። */
function isDark(hex: string) {
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 60;
}

export function ServiceLogo({ name, logoUrl = null, className }: { name: string; logoUrl?: string | null; className?: string }) {
  const icon = icons[name] ?? legacyLogos[name];
  const box = cn("flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-foreground/10", className);
  if (logoUrl) {
    return (
      <span aria-hidden className={cn(box, "bg-white/95 dark:bg-white/10")}>
        <Image unoptimized src={logoUrl} alt="" width={160} height={160} className="size-3/4 object-contain" />
      </span>
    );
  }
  if (icon) {
    return (
      <span aria-hidden className={cn(box, "bg-white/95 dark:bg-white/10")}>
        <svg viewBox="0 0 24 24" className={cn("size-1/2", isDark(icon.hex) ? "fill-black dark:fill-white" : "")} style={isDark(icon.hex) ? undefined : { fill: `#${icon.hex}` }}>
          <path d={icon.path} />
        </svg>
      </span>
    );
  }
  const color = brandColors[name];
  return (
    <span
      aria-hidden
      className={cn(box, "text-sm font-bold", color ? "text-white" : "bg-primary/15 text-primary")}
      style={color ? { backgroundColor: color } : undefined}
    >
      {serviceMark(name)}
    </span>
  );
}
