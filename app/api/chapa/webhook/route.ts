import { validChapaSignature } from "@/lib/chapa";
import { confirmChapaPayment } from "@/lib/subscriptions";

/**
 * የቻፓ webhook (በዳሽቦርዱ Webhooks ትር ላይ https://ethiocomputer.com/api/chapa/webhook እና CHAPA_WEBHOOK_SECRET)።
 * ፊርማው ካልተረጋገጠ ይጣላል፤ ቢረጋገጥም ክፍያው በverify እንደገና ይታያል።
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!validChapaSignature(raw, request.headers)) return new Response(null, { status: 401 });
  let txRef: string | undefined;
  try {
    txRef = (JSON.parse(raw) as { tx_ref?: string }).tx_ref;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (txRef) await confirmChapaPayment(txRef).catch((error) => console.error("chapa webhook", error));
  return Response.json({ ok: true });
}
