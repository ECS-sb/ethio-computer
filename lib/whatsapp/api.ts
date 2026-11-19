import "server-only";

/** ለሙከራ ብቻ ሊቀየር ይችላል (የውሸት Graph ሰርቨር)፤ በproduction አይቀመጥም። */
const API_BASE = process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com";
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v23.0";

export class WhatsAppApiError extends Error {}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** token ከenv ብቻ ይነበባል፤ በlog ወይም በስህተት መልዕክት ውስጥ አይወጣም። */
async function sendRaw(body: Record<string, unknown>): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new WhatsAppApiError("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
  const response = await fetch(`${API_BASE}/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    messages?: { id: string }[];
    error?: { message?: string; code?: number };
  } | null;
  const id = data?.messages?.[0]?.id;
  if (!response.ok || !id) {
    throw new WhatsAppApiError(`send failed: ${data?.error?.code ?? response.status} ${data?.error?.message ?? ""}`.trim());
  }
  return id;
}

/** ዋትሳፕ የሚፈቅደው ደንበኛው ባለፉት 24 ሰዓታት ውስጥ ከጻፈ ብቻ ነው (ከዚያ ውጪ template ያስፈልጋል)። */
export function sendText(to: string, body: string) {
  return sendRaw({ to, type: "text", text: { body: body.slice(0, 4096), preview_url: false } });
}

export type ReplyButton = { id: string; title: string };

/** እስከ 3 አዝራሮች፤ የእያንዳንዱ ርዕስ እስከ 20 ፊደል። */
export function sendButtons(to: string, body: string, buttons: ReplyButton[]) {
  return sendRaw({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({ type: "reply", reply: { id: button.id, title: button.title.slice(0, 20) } })),
      },
    },
  });
}
