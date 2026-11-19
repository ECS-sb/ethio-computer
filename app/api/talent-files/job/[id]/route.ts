import { getCurrentUser } from "@/lib/session";
import { getJobFile } from "@/lib/talent-queries";

const INLINE_TYPES = /^(image\/(jpeg|png|webp|gif)|audio\/[\w.+-]+|video\/(mp4|webm))$/;

/** የተረከበ የስራ ፋይል፦ ለደንበኛው፣ ለባለሙያው እና ለአድሚኑ ብቻ። ሌላ አይነት ፋይል በገጹ ላይ እንዳይከፈት እንደ ማውረጃ ይላካል። */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.suspended) return new Response(null, { status: 404 });
  const { id } = await params;
  const file = await getJobFile(id, user);
  if (!file) return new Response(null, { status: 404 });
  const inline = INLINE_TYPES.test(file.mimeType) && new URL(request.url).searchParams.get("download") !== "1";
  const name = encodeURIComponent(file.name);
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": inline ? file.mimeType : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
