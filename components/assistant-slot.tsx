import { AssistantWidget } from "@/components/assistant-widget";
import { aiEnabled } from "@/lib/telegram/ai";

/** የAI ረዳቱ የሚታየው ANTHROPIC_API_KEY ሲኖር ብቻ ነው። */
export function AssistantSlot() {
  return aiEnabled() ? <AssistantWidget /> : null;
}
