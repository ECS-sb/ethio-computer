import type { NextRequest } from "next/server";
import { analyzePending, countPending } from "@/lib/telegram/analyze";
import { sendAlertNotifications } from "@/lib/telegram/report";

export const maxDuration = 300;

/**
 * Vercel Cron ከዕለታዊው ሪፖርት በፊት ይጠራዋል (vercel.json)፤ አዲስ መልዕክት ያላቸውን ቻቶች Claude ይተነትናል።
 * የቆዩ ቻቶች ከexport ሲገቡ ?chats=120 እየተባለ ደጋግሞ ይጠራል (በአንድ ጥሪ ቢበዛ 150)፤ ምላሹ የቀሩትን ቁጥር ይነግራል።
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  const requested = Number(request.nextUrl.searchParams.get("chats"));
  const chats = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 150) : 40;
  const result = await analyzePending({ chats });
  if (result.alerts.length > 0) await sendAlertNotifications(result.alerts);
  const pending = await countPending();
  return Response.json({ receipts: result.receipts, chats: result.chats, alerts: result.alerts.length, pending });
}
