import { createHmac, timingSafeEqual } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { sendAutoReplies } from "@/lib/whatsapp/autoreply";
import { handleWebhook } from "@/lib/whatsapp/ingest";
import type { WaWebhook } from "@/lib/whatsapp/types";

export const maxDuration = 60;

function sameText(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Meta webhook-ኡን ሲመዘግብ አንድ ጊዜ የሚልከው ማረጋገጫ፦ verify token ከተመሳሰለ challenge-ኡ ይመለሳል። */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  const given = params.get("hub.verify_token") ?? "";
  if (params.get("hub.mode") !== "subscribe" || !expected || !sameText(given, expected)) {
    return new Response(null, { status: 403 });
  }
  return new Response(params.get("hub.challenge") ?? "", { headers: { "content-type": "text/plain" } });
}

/** Meta እያንዳንዱን መልዕክትና የመድረስ ሁኔታ (status) ወደዚህ ይልካል፤ ፊርማው በApp secret ይረጋገጣል። */
export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = secret ? `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}` : "";
  if (!secret || !sameText(signature, expected)) return new Response(null, { status: 401 });

  let payload: WaWebhook;
  try {
    payload = JSON.parse(raw) as WaWebhook;
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    // መልዕክቱ ወዲያውኑ ይቀመጣል፤ መልሱ ከምላሹ በኋላ ይላካል። ብዙ ተማሪዎች በአንዴ ሲጽፉ Meta ቶሎ 200 ያገኛል።
    const inbound = await handleWebhook(payload);
    if (inbound.length > 0) after(() => sendAutoReplies(inbound));
  } catch (error) {
    // ምንም ካልተቀመጠ Meta ደግሞ እንዲሞክር 500 ይመለሳል፤ የተቀመጡት መልዕክቶች በሁለተኛው ሙከራ አይደገሙም።
    console.error("whatsapp webhook failed", error);
    return new Response(null, { status: 500 });
  }
  return Response.json({ ok: true });
}
