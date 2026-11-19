import { PlatformLogo } from "@/components/platform-logo";
import type { PlatformId } from "@/lib/catalog";
import { getPlatform } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** በጨለማው አሞሌ ላይ እንዲነበቡ የብራንድ ቀለሞች (TikTok እና X ጥቁር ሎጎ ስላላቸው በራሳቸው ደማቅ ቀለም)። */
const brand: Record<PlatformId, { text: string; fill: string }> = {
  instagram: { text: "text-[#E1306C]", fill: "fill-[#E1306C]" },
  tiktok: { text: "text-[#25F4EE]", fill: "fill-[#25F4EE]" },
  youtube: { text: "text-[#FF0033]", fill: "fill-[#FF0033]" },
  telegram: { text: "text-[#2AABEE]", fill: "fill-[#2AABEE]" },
  facebook: { text: "text-[#1877F2]", fill: "fill-[#1877F2]" },
  x: { text: "text-[#E7E9EA]", fill: "fill-[#E7E9EA]" },
};

/**
 * የማስታወቂያ ስክሪንሾት በፕላትፎርሙ ብራንድ አሞሌ ውስጥ፦ ከላይ ሎጎውና ስሙ በብራንድ ቀለሙ፣ ከስሩ ሻጩ የሰቀለው ምስል።
 * ዋናው ምስል አይቀየርም (አድሚኑ ለማረጋገጥ ኦሪጅናሉን ያያል)፤ አሞሌው በሚታይበት ጊዜ ብቻ ይጨመራል።
 */
export function ScreenshotFrame({ platform, className, children }: { platform: string; className?: string; children: React.ReactNode }) {
  const info = getPlatform(platform);
  if (!info) return <div className={cn("overflow-hidden rounded-xl", className)}>{children}</div>;
  const look = brand[info.id];
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl bg-[#0b0b0b] ring-1 ring-foreground/10", className)}>
      <div className="flex shrink-0 items-center gap-2 bg-[#141414] px-4 py-2.5">
        <PlatformLogo id={info.id} className={look.fill} />
        <span className={cn("text-sm font-bold", look.text)}>{info.name}</span>
      </div>
      {children}
    </div>
  );
}
