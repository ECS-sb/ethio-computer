import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * ቻፓ (https://developer.chapa.co)፦ ደንበኛው በቴሌብር፣ በሲቢኢ ብር፣ በባንክ ወይም በካርድ ይከፍላል።
 * CHAPA_SECRET_KEY ከሌለ ቻፓ አይታይም (ከዋሌት መክፈል ብቻ ይቀራል)። የክፍያው ሁኔታ ሁልጊዜ በverify ይረጋገጣል፤
 * ከአሳሹ ወይም ከwebhook የሚመጣ "ተከፍሏል" ብቻውን አይታመንም።
 */

const API = "https://api.chapa.co/v1";

function secret(): string | null {
  return process.env.CHAPA_SECRET_KEY?.trim() || null;
}

export function chapaEnabled(): boolean {
  return secret() !== null;
}

export function siteUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "https://ethiocomputer.com").replace(/\/+$/, "");
}

/** ቻፓ በማብራሪያው ውስጥ ፊደል፣ ቁጥር፣ ሰረዝ፣ ነጥብና ክፍተት ብቻ ይቀበላል። */
function plain(text: string, max: number): string {
  return text.replace(/[^A-Za-z0-9 ._-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type ChapaCheckout = {
  amountEtb: number;
  txRef: string;
  email: string;
  name: string;
  description: string;
  returnPath: string;
};

/** የክፍያ ገጽ ይከፍታል፤ ደንበኛው የሚላክበትን checkout_url ይመልሳል። */
export async function startChapaCheckout(input: ChapaCheckout): Promise<string> {
  const key = secret();
  if (!key) throw new Error("chapa: CHAPA_SECRET_KEY is not set");
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const response = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(input.amountEtb),
      currency: "ETB",
      email: input.email,
      first_name: plain(firstName || "Customer", 40) || "Customer",
      last_name: plain(rest.join(" "), 40) || "-",
      tx_ref: input.txRef,
      callback_url: `${siteUrl()}/api/chapa/callback?tx_ref=${encodeURIComponent(input.txRef)}`,
      return_url: `${siteUrl()}${input.returnPath}`,
      customization: { title: "Ethio Computer", description: plain(input.description, 50) || "Payment" },
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as { status?: string; message?: unknown; data?: { checkout_url?: string } } | null;
  const url = body?.data?.checkout_url;
  if (!response.ok || !url) throw new Error(`chapa: initialize failed (${response.status}): ${JSON.stringify(body?.message ?? null)}`);
  return url;
}

export type ChapaVerification = { paid: boolean; amountEtb: number; currency: string };

/** የክፍያውን ትክክለኛ ሁኔታ ከቻፓ ይጠይቃል። ገና ካልተከፈለ paid=false። */
export async function verifyChapa(txRef: string): Promise<ChapaVerification | null> {
  const key = secret();
  if (!key) return null;
  const response = await fetch(`${API}/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as { data?: { status?: string; amount?: number | string; currency?: string } | null } | null;
  const data = body?.data;
  if (!response.ok || !data) return { paid: false, amountEtb: 0, currency: "" };
  return { paid: data.status === "success", amountEtb: Number(data.amount ?? 0), currency: String(data.currency ?? "") };
}

function sameHex(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received.trim(), "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/**
 * የwebhook ፊርማ፦ x-chapa-signature = HMAC-SHA256(ጥሬው body)፣ chapa-signature = HMAC-SHA256(ሚስጥሩ ራሱ)፣
 * ሁለቱም በዳሽቦርዱ በተቀመጠው CHAPA_WEBHOOK_SECRET። አንዱ ትክክል ከሆነ ይቀበላል።
 */
export function validChapaSignature(rawBody: string, headers: Headers): boolean {
  const hookSecret = process.env.CHAPA_WEBHOOK_SECRET?.trim();
  if (!hookSecret) return false;
  const bodySignature = createHmac("sha256", hookSecret).update(rawBody).digest("hex");
  const secretSignature = createHmac("sha256", hookSecret).update(hookSecret).digest("hex");
  return sameHex(bodySignature, headers.get("x-chapa-signature")) || sameHex(secretSignature, headers.get("chapa-signature"));
}
