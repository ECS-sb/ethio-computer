import { confirmChapaPayment } from "@/lib/subscriptions";

/** ቻፓ ክፍያው ሲያልቅ የሚጠራው (GET)። tx_ref እኛ ባስቀመጥነው query ይመጣል፤ ሁኔታው ሁልጊዜ በverify ይረጋገጣል። */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const txRef = params.get("tx_ref") ?? params.get("trx_ref");
  if (txRef) await confirmChapaPayment(txRef).catch((error) => console.error("chapa callback", error));
  return Response.json({ ok: true });
}
