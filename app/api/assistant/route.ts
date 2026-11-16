import type { NextRequest } from "next/server";
import { z } from "zod";
import { streamAssistantReply } from "@/lib/assistant";
import { aiEnabled } from "@/lib/telegram/ai";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "am"]).default("en"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) }))
    .min(1)
    .max(20)
    .refine((messages) => messages[0].role === "user" && messages.at(-1)?.role === "user"),
});

/** የAI ረዳቱ መልስ እንደ ጽሑፍ ፍሰት (stream) ይላካል። ውይይቱ አይቀመጥም። */
export async function POST(request: NextRequest) {
  if (!aiEnabled()) return new Response("AI is not set up", { status: 503 });
  // ከሌላ ድረ-ገጽ የሚመጡ ጥያቄዎች አይቀበሉም (ወጪ እንዳያስወጡ)።
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return new Response(null, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const stream = streamAssistantReply(parsed.data.messages, parsed.data.language);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        console.log(`assistant: model=${final.model} in=${final.usage.input_tokens} out=${final.usage.output_tokens} stop=${final.stop_reason}`);
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n…"));
      } catch (error) {
        console.error("assistant failed", error);
        controller.enqueue(encoder.encode("\u0000"));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
