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
import { serviceMark } from "@/lib/subscription-catalog";
import { cn } from "@/lib/utils";

/**
 * የአገልግሎቱ ሎጎ፦ simple-icons (CC0) ያለው ሎጎ በብራንድ ቀለሙ፤ ሎጎው የሌለው (ባለቤቶቹ ስላስወጡት) በብራንድ ቀለሙ ላይ የስሙ ፊደላት።
 * በአድሚኑ የተጨመረ አዲስ አገልግሎት ፊደላቱን በወርቃማው ቀለም ያሳያል።
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
  "LinkedIn Premium": "#0A66C2",
  "ChatGPT Plus": "#10A37F",
  Midjourney: "#000000",
  "Amazon Prime Video": "#1A98FF",
  "Disney+": "#113CCF",
  "Canva Pro": "#00C4CC",
  "CapCut Pro": "#000000",
  "Adobe Creative Cloud": "#DA1F26",
  "Adobe Photoshop": "#31A8FF",
  "Epidemic Sound": "#000000",
  "Microsoft 365": "#D83B01",
  "Xbox Game Pass Ultimate": "#107C10",
};

/** ጥቁር ሎጎዎች በጨለማው ገጽታ እንዳይጠፉ በጽሑፉ ቀለም ይታያሉ። */
function isDark(hex: string) {
  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 60;
}

export function ServiceLogo({ name, className }: { name: string; className?: string }) {
  const icon = icons[name];
  const box = cn("flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-foreground/10", className);
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
