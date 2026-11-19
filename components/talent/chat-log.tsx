import { getT } from "@/lib/i18n-server";
import { isMessageKey } from "@/lib/talent-catalog";
import { cn } from "@/lib/utils";

type ChatMessage = { id: string; senderId: string; body: string; system: boolean; createdAt: Date };

/** የቻቱ መልዕክቶች፦ የራስ በቀኝ፣ የሌላው በግራ፣ የሲስተም ማስታወሻዎች በመሃል። names ሲሰጥ (ለአድሚኑ) የላኪው ስም ይታያል። */
export async function ChatLog({ messages, selfId, names }: { messages: ChatMessage[]; selfId: string; names?: Record<string, string> }) {
  const t = await getT();
  if (messages.length === 0) return <p className="m-auto text-sm text-muted-foreground">{t("Start the conversation.")}</p>;
  return messages.map((message) => {
    if (message.system) {
      return (
        <p key={message.id} className="self-center rounded-full bg-primary/10 px-4 py-1 text-center text-xs text-primary ring-1 ring-primary/30">
          {isMessageKey(message.body) ? t(message.body) : message.body}
        </p>
      );
    }
    const own = message.senderId === selfId;
    return (
      <div key={message.id} className={cn("flex max-w-[80%] flex-col gap-1", own ? "self-end items-end" : "self-start items-start")}>
        {names ? <span className="text-xs text-muted-foreground">{names[message.senderId] ?? ""}</span> : null}
        <p
          className={cn(
            "rounded-xl px-4 py-2 text-sm break-words whitespace-pre-line",
            own ? "bg-primary text-primary-foreground" : "bg-secondary"
          )}
        >
          {message.body}
        </p>
      </div>
    );
  });
}
