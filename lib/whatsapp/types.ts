// WhatsApp Cloud API webhook የሚልካቸው ቅርጾች (የምንጠቀምባቸው መስኮች ብቻ)።
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

export type WaMedia = { id: string; mime_type?: string; caption?: string; filename?: string };

/** ከClick-to-WhatsApp ማስታወቂያ ሲመጣ የመጀመሪያው መልዕክት ላይ ይያያዛል። */
export type WaReferral = {
  source_url?: string;
  source_id?: string;
  source_type?: string;
  headline?: string;
  body?: string;
  media_type?: string;
  ctwa_clid?: string;
};

export type WaMessage = {
  from: string;
  /** echo (ከስልኩ app የተላከ) ሲሆን ተቀባዩ ደንበኛ */
  to?: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply" | "nfm_reply" | string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { name?: string; body?: string; response_json?: string };
  };
  button?: { payload?: string; text: string };
  image?: WaMedia;
  audio?: WaMedia;
  video?: WaMedia;
  document?: WaMedia;
  sticker?: WaMedia;
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: { name?: { formatted_name?: string }; phones?: { phone?: string }[] }[];
  reaction?: { message_id: string; emoji?: string };
  referral?: WaReferral;
};

export type WaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title?: string; message?: string; error_data?: { details?: string } }[];
};

export type WaChangeValue = {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
  /** coexistence፦ ሰራተኛው ከWhatsApp Business app የላካቸው መልዕክቶች */
  message_echoes?: WaMessage[];
};

export type WaWebhook = {
  object?: string;
  entry?: { id: string; changes?: { field: string; value: WaChangeValue }[] }[];
};
