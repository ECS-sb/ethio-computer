import { getServiceLogo } from "@/lib/subscriptions";

/** አድሚኑ የሰቀለው የሰብስክሪፕሽን ሎጎ (WebP)። አድራሻው ?v= ስላለው ሲቀየር አዲሱ ይታያል። */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logo = await getServiceLogo(id);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
