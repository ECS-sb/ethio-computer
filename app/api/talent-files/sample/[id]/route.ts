import { getCurrentUser } from "@/lib/session";
import { getGigSampleFile } from "@/lib/talent-queries";

/** የፖርትፎሊዮ ናሙና (ምስል ወይም ድምፅ)። */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variant = new URL(request.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  const file = await getGigSampleFile(id, variant, getCurrentUser);
  if (!file) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": file.isPublic ? "public, max-age=3600, s-maxage=86400" : "private, no-store",
    },
  });
}
