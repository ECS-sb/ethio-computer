# የዋትሳፕ (WhatsApp Cloud API) ማዋቀሪያ — የት/ቤቱ ተማሪ ምዝገባ

ይህ ቁጥር ለት/ቤቱ ብቻ ነው። ከአካውንት መሸጫው ጋር አይቀላቀልም።

## 1. Meta App
1. developers.facebook.com → **My Apps → Create App** → "Business" አይነት → የት/ቤቱን Meta Business account ይምረጡ።
2. App ውስጥ **Add product → WhatsApp → Set up**።
3. **WhatsApp → API Setup** ላይ የት/ቤቱን ቁጥር ይጨምሩ።
   - ቁጥሩ አሁን በWhatsApp Business app ላይ ከሆነ እና እዚያው መቀጠል ከፈለጉ፣ ሲጨምሩት "coexistence" (Business app-ኡን መጠቀም መቀጠል) የሚለውን አማራጭ ይምረጡ።
4. ከዚያው ገጽ **Phone number ID**-ን ይቅዱ።

## 2. ቋሚ Access token
1. business.facebook.com → **Settings → Users → System users → Add** (Admin)።
2. **Add assets** → የተፈጠረውን App እና የWhatsApp account ይስጡት።
3. **Generate token** → ፈቃዶች፦ `whatsapp_business_messaging`፣ `whatsapp_business_management` → Expiration፦ Never።

## 3. Environment variables (Vercel → ethio-computer → Settings → Environment Variables፣ እና `.env.local`)
| ስም | ከየት |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | ደረጃ 2 ላይ የተፈጠረው token |
| `WHATSAPP_PHONE_NUMBER_ID` | ደረጃ 1.4 |
| `WHATSAPP_APP_SECRET` | App → **App settings → Basic → App secret** |
| `WHATSAPP_VERIFY_TOKEN` | እርስዎ የሚፈጥሩት ረጅም የዘፈቀደ ጽሑፍ (ለምሳሌ `openssl rand -hex 24`) |
| `WHATSAPP_SCHOOL_NAME` | (አማራጭ) በእንኳን ደህና መጡ መልዕክቱ ላይ የሚታየው ስም፤ ነባሪው "Ethio Computer School" |
| `WHATSAPP_REPLY_LOCALE` | (አማራጭ) `en` ከሆነ አውቶ ሪፕላዮቹ በእንግሊዝኛ ይሆናሉ፤ ነባሪው አማርኛ |

ከጨመሩ በኋላ Vercel ላይ redeploy ያድርጉ።

## 4. Webhook
1. App → **WhatsApp → Configuration → Webhook → Edit**።
2. Callback URL፦ `https://ethiocomputer.com/api/whatsapp/webhook`
3. Verify token፦ ከላይ `WHATSAPP_VERIFY_TOKEN` ላይ ያስገቡት ተመሳሳይ ጽሑፍ → **Verify and save**።
4. **Webhook fields** ላይ `messages`ን ያብሩ (coexistence ከሆነ `smb_message_echoes`ንም)።

## 5. ሙከራ
ከሌላ ስልክ ለት/ቤቱ ቁጥር "ሰላም" ብለው ይጻፉ። የእንኳን ደህና መጡ መልዕክት ከሶስት አዝራሮች ጋር መምጣት አለበት።

## አውቶ ሪፕላዩ እንዴት ይሰራል
- አዲስ ሰው ሲጽፍ (ወይም ከ12 ሰዓት በኋላ ደግሞ ሲጽፍ) → እንኳን ደህና መጡ + [ኮርሶችና ዋጋ] [ተመዝገብ] [ሰው አናግረኝ]።
- "ሰው አናግረኝ" ሲጫን ቻቱ ለstaff ምልክት ይደረግበታል፤ staff እስኪመልስ አውቶ ሪፕላዩ ዝም ይላል።
- ከፌስቡክ/ኢንስታግራም ማስታወቂያ (Click-to-WhatsApp) የመጣ ሰው የማስታወቂያው መረጃ ከቻቱ ጋር ይቀመጣል።
- ጽሑፎቹ በ`lib/messages.ts` ውስጥ ናቸው።
