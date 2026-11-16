import Image from "next/image";
import { LayersIcon, ShieldCheckIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { platforms, type PlatformId } from "@/lib/catalog";
import { getT } from "@/lib/i18n-server";
import { platformLogoPaths } from "@/lib/platform-logos";
import { cn } from "@/lib/utils";

type Orbiter = { id: Exclude<PlatformId, "x">; angle: number; fill: string; glow: string; delay: string };

// ሎጎዎቹ በግማሽ ክብ ቅስት ላይ (ዲግሪ፦ 180 ግራ፣ 90 ላይ፣ 0 ቀኝ)። ቀለሞቹ የእያንዳንዱ ብራንድ ናቸው።
const orbiters: Orbiter[] = [
  { id: "instagram", angle: 168, fill: "fill-[url(#ig-gradient)]", glow: "bg-[#E1306C]", delay: "[animation-delay:0s]" },
  { id: "tiktok", angle: 128, fill: "fill-foreground", glow: "bg-[#25F4EE]", delay: "[animation-delay:-1s]" },
  { id: "youtube", angle: 90, fill: "fill-[#FF0033]", glow: "bg-[#FF0033]", delay: "[animation-delay:-2s]" },
  { id: "telegram", angle: 52, fill: "fill-[#26A5E4]", glow: "bg-[#26A5E4]", delay: "[animation-delay:-3s]" },
  { id: "facebook", angle: 12, fill: "fill-[#0866FF]", glow: "bg-[#0866FF]", delay: "[animation-delay:-4s]" },
];

// ሳጥኑ 2:1 ስለሆነ ቅስቱ በማንኛውም ስፋት ክብ ሆኖ ይቀራል (መሃሉ ከታች፣ ራዲየሱ 45% የስፋቱ)።
function position(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { left: `${50 + 45 * Math.cos(radians)}%`, top: `${100 - 90 * Math.sin(radians)}%` };
}

/** የፕላትፎርም ሎጎዎች በቅስት ላይ፤ ሲነኩ የዚያ ፕላትፎርም አካውንቶች ይከፈታሉ። */
export async function PlatformOrbit({ title, highlight }: { title: string; highlight: string }) {
  const t = await getT();
  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-4xl">
      <svg aria-hidden viewBox="0 0 200 100" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id="orbit-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: "var(--primary)" }} stopOpacity="0" />
            <stop offset="0.5" style={{ stopColor: "var(--primary)" }} stopOpacity="0.7" />
            <stop offset="1" style={{ stopColor: "var(--gold-2)" }} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="orbit-title-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: "var(--primary)" }} />
            <stop offset="1" style={{ stopColor: "var(--gold-2)" }} />
          </linearGradient>
          {/* ርዕሱ የሚጻፍበት ቅስት (በውጪው ቅስትና በመሃሉ ሎጎ መካከል) */}
          <path id="orbit-title-path" d="M36.6 70.4 A70 70 0 0 1 163.4 70.4" />
          <radialGradient id="ig-gradient" cx="0.3" cy="1.07" r="1.3">
            <stop offset="0" stopColor="#FFDD55" />
            <stop offset="0.35" stopColor="#FF543E" />
            <stop offset="0.65" stopColor="#C837AB" />
            <stop offset="1" stopColor="#4F5BD5" />
          </radialGradient>
        </defs>
        <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="url(#orbit-arc)" strokeWidth="0.6" />
        <path d="M40 100 A60 60 0 0 1 160 100" fill="none" stroke="url(#orbit-arc)" strokeWidth="0.4" strokeDasharray="1.5 2.5" opacity="0.6" />
        {/* የተጣመመው ርዕስ፤ ለስክሪን አንባቢዎች እውነተኛው h1 በገጹ ላይ አለ። */}
        <text className="font-heading text-[7px] sm:text-[5.8px]" fontWeight="800" letterSpacing="-0.15" textAnchor="middle">
          <textPath href="#orbit-title-path" startOffset="50%">
            <tspan className="fill-foreground">{title}</tspan> <tspan fill="url(#orbit-title-gold)">{highlight}</tspan>
          </textPath>
        </text>
      </svg>

      {/* መሃሉ፦ የEthio Market ሎጎ ከወርቃማ ብርሃን ጋር */}
      <LocaleLink
        href="/accounts"
        aria-label={t("Go to the market")}
        className="group absolute top-[72%] left-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full sm:size-36 lg:size-44"
      >
        <span aria-hidden className="absolute inset-[-60%] rounded-full bg-primary/20 blur-3xl" />
        <span aria-hidden className="absolute inset-[-18%] rounded-full ring-1 ring-primary/15" />
        <span aria-hidden className="absolute inset-[-38%] rounded-full ring-1 ring-primary/10" />
        <span className="relative flex size-full items-center justify-center rounded-full bg-card/60 shadow-2xl shadow-primary/20 ring-1 ring-primary/40 backdrop-blur-xl transition-transform duration-300 group-hover:scale-105">
          <Image src="/brand/logo-mark.svg" alt="" width={96} height={96} className="size-12 sm:size-20 lg:size-24" />
        </span>
      </LocaleLink>

      {orbiters.map((orbiter) => {
        const platform = platforms.find((item) => item.id === orbiter.id);
        if (!platform) return null;
        return (
          <LocaleLink
            key={orbiter.id}
            href={`/accounts?platform=${orbiter.id}`}
            aria-label={t("{platform} accounts", { platform: platform.name })}
            style={position(orbiter.angle)}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          >
            <span className={cn("relative motion-safe:animate-[bounce_6s_ease-in-out_infinite]", orbiter.delay)}>
              <span aria-hidden className={cn("absolute inset-0 rounded-xl opacity-30 blur-xl transition-opacity group-hover:opacity-70", orbiter.glow)} />
              <span className="relative flex size-12 items-center justify-center rounded-xl bg-card/60 shadow-xl shadow-black/50 ring-1 ring-foreground/15 backdrop-blur-xl transition-all duration-300 group-hover:scale-110 group-hover:ring-primary/60 sm:size-16 lg:size-20">
                <svg aria-hidden viewBox="0 0 24 24" className={cn("size-6 sm:size-8 lg:size-10", orbiter.fill)}>
                  <path d={platformLogoPaths[orbiter.id]} />
                </svg>
              </span>
            </span>
            <span className="hidden rounded-full bg-card/70 px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 backdrop-blur-sm transition-colors group-hover:text-foreground sm:block">
              {platform.name}
            </span>
          </LocaleLink>
        );
      })}

      {/* የእምነት ምልክቶች (በትልቅ ስክሪን ብቻ) */}
      <p className="absolute top-[70%] left-[24%] hidden -translate-x-1/2 items-center gap-2 rounded-full bg-card/60 px-4 py-2 text-xs font-medium ring-1 ring-foreground/10 backdrop-blur-xl md:flex">
        <ShieldCheckIcon className="size-4 text-primary" />
        {t("Ownership is verified")}
      </p>
      <p className="absolute top-[70%] left-[76%] hidden -translate-x-1/2 items-center gap-2 rounded-full bg-card/60 px-4 py-2 text-xs font-medium ring-1 ring-foreground/10 backdrop-blur-xl md:flex">
        <LayersIcon className="size-4 text-primary" />
        {t("{count} platforms", { count: platforms.length })} · {t("in one market")}
      </p>
    </div>
  );
}
