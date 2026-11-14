import type { PersonRole } from "@/lib/telegram/profile";
import { cn } from "@/lib/utils";

// ከቴሌግራም የስም ቀለሞች፦ ገዢ አረንጓዴ፣ ሻጭ ብርቱካናማ፣ ተማሪ ወይን ጠጅ።
const roleColors: Record<PersonRole, string> = {
  BUYER: "bg-[#7bc862]/15 text-[#7bc862]",
  SELLER: "bg-[#faa774]/15 text-[#faa774]",
  STUDENT: "bg-[#a695e7]/15 text-[#a695e7]",
};

/** ሰውየው ገዢ፣ ሻጭ ወይስ ተማሪ እንደሆነ የሚያሳይ ትንሽ ምልክት (AI ከቻቱ የለየው)። */
export function RoleBadge({ role, label, className }: { role: PersonRole; label: string; className?: string }) {
  return <span className={cn("shrink-0 rounded-md px-1.5 py-px text-[10px] leading-4 font-semibold", roleColors[role], className)}>{label}</span>;
}
