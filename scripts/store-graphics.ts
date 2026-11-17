// የPlay Store ምስሎችን ያዘጋጃል፦ store/play/feature-graphic.png (1024×500) እና icon-512.png።
//   npx tsx scripts/store-graphics.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { platformLogoPaths } from "@/lib/platform-logos";

const out = path.join(process.cwd(), "store", "play");
fs.mkdirSync(out, { recursive: true });

const mark = fs.readFileSync("app/icon.svg", "utf8");

const logos = (["youtube", "facebook", "tiktok", "telegram", "instagram"] as const)
  .map((id, index) => {
    const x = 590 + index * 82;
    return `<g transform="translate(${x} 330)">
      <rect width="64" height="64" rx="16" fill="#111827" stroke="#FFBE1A" stroke-opacity="0.35"/>
      <path transform="translate(16 16) scale(1.333)" fill="#F2F2F2" d="${platformLogoPaths[id]}"/>
    </g>`;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFBE1A"/><stop offset="1" stop-color="#FFAA33"/></linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.5" r="0.6"><stop offset="0" stop-color="#FFBE1A" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1024" height="500" fill="#000"/>
  <rect width="1024" height="500" fill="url(#glow)"/>
  <circle cx="830" cy="250" r="230" fill="none" stroke="#FFBE1A" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="830" cy="250" r="170" fill="none" stroke="#FFBE1A" stroke-opacity="0.12" stroke-width="2"/>
  <text x="64" y="150" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600" fill="#FFBE1A" letter-spacing="4">ETHIO COMPUTER</text>
  <text x="64" y="225" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="#F2F2F2">Buy &amp; sell social</text>
  <text x="64" y="295" font-family="Segoe UI, Arial, sans-serif" font-size="58" font-weight="800" fill="url(#gold)">media accounts</text>
  <text x="64" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#F2F2F2" fill-opacity="0.75">Verified sellers · Payment held until handover</text>
  ${logos}
</svg>`;

async function main() {
  const iconPng = await sharp(Buffer.from(mark), { density: 300 }).resize(150, 150).png().toBuffer();
  await sharp(Buffer.from(svg))
    .composite([{ input: iconPng, left: 755, top: 120 }])
    .flatten({ background: "#000000" })
    .png()
    .toFile(path.join(out, "feature-graphic.png"));
  // Play Store አዶው ግልጽነት (transparency) የሌለው 512×512 መሆን አለበት።
  await sharp("public/icon-maskable-512.png").flatten({ background: "#0A1329" }).png().toFile(path.join(out, "icon-512.png"));
  console.log("Wrote store/play/feature-graphic.png and store/play/icon-512.png");
}

void main();
