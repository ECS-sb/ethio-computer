import { getAdminFile } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

/** የተቀማጭ ደረሰኝና የመታወቂያ ፎቶ ለአድሚን ብቻ ይታያሉ፤ ለሌሎች 404 (መኖራቸውም እንዳይታወቅ)። */
export async function GET(_: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin || user.suspended) return new Response(null, { status: 404 });
  const { kind, id } = await params;
  const bytes = await getAdminFile(kind, id);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
  });
}
