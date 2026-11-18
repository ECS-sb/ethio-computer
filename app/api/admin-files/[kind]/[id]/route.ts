import { getAdminFile } from "@/lib/queries";
import { getTelegramViewer } from "@/lib/telegram/access";

/**
 * የተቀማጭ ደረሰኝ ለአድሚኑና "Approve deposits" ለተፈቀደለት ሰራተኛ፣ የመታወቂያ ፎቶ ደግሞ "Verify sellers" ለተፈቀደለት ብቻ ይታያሉ።
 * ለሌሎች 404 (መኖራቸውም እንዳይታወቅ)።
 */
export async function GET(_: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const viewer = await getTelegramViewer();
  const { kind, id } = await params;
  const allowed = (kind === "deposit" && viewer?.can.deposits) || (kind === "verification" && viewer?.can.verifications);
  if (!allowed) return new Response(null, { status: 404 });
  const bytes = await getAdminFile(kind, id);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
  });
}
