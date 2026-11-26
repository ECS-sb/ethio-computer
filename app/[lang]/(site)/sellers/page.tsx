import { permanentRedirect } from "next/navigation";
import { localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

/** የ"ሻጮች" ገጽ በኤሌክትሮኒክስ ገበያው ተተክቷል፤ የቆዩ ሊንኮች ወደዚያ ይሄዳሉ። */
export default async function SellersPage() {
  permanentRedirect(localePath(await getLocale(), "/electronics"));
}
