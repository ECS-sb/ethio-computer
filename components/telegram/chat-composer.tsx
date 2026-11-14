"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, PencilIcon, RefreshCwIcon, SendIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { sendTelegramReplyAction, suggestTelegramReplyAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

export type ComposerState = "ready" | "botNotAllowed" | "windowClosed";

/**
 * ከቻቱ በታች ያለው የመጻፊያ ሳጥን፦ ሰራተኛው ይጽፋል (Enter ይልካል፣ Shift+Enter አዲስ መስመር)፤ መልዕክቱ በድርጅቱ አካውንት ስም ይላካል።
 * ከላይ AI ያዘጋጀው የመልስ ሀሳብ ይታያል፦ "ላክ" በአንድ ቁልፍ ይልከዋል፣ "አስተካክል" ወደ ሳጥኑ ያስገባዋል።
 * ሰውየው ጽፎ መልስ እየጠበቀ ከሆነ ሀሳቡ በራሱ ይዘጋጃል (አንድ ጊዜ ብቻ፤ ተቀምጦ ለሁሉም ሰራተኞች ይታያል)።
 */
export function ChatComposer({
  chatId,
  state,
  aiEnabled,
  initialSuggestion,
  autoSuggestFor,
}: {
  chatId: string;
  state: ComposerState;
  aiEnabled: boolean;
  initialSuggestion: string | null;
  /** መልስ የሚጠብቀው የሰውየው መጨረሻ መልዕክት (ሀሳብ ገና ካልተዘጋጀለት)፤ አዲስ መልዕክት ሲመጣ አዲስ ሀሳብ ይዘጋጃል */
  autoSuggestFor: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [suggesting, setSuggesting] = useState(false);
  const [sending, startSending] = useTransition();
  const requested = useRef<string | null>(null);
  const ready = state === "ready";

  const suggest = async (force: boolean) => {
    setSuggesting(true);
    const result = await suggestTelegramReplyAction(chatId, force);
    setSuggesting(false);
    if (result.ok && result.text) setSuggestion(result.text);
    else if (force) toast.error(t(result.message));
  };

  // መልስ የሚጠብቅ ቻት ሲከፈት AI ሀሳቡን በራሱ ያዘጋጃል።
  useEffect(() => {
    if (autoSuggestFor && aiEnabled && requested.current !== autoSuggestFor) {
      requested.current = autoSuggestFor;
      void suggest(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSuggestFor, aiEnabled]);

  // ከሰርቨሩ አዲስ ሀሳብ ሲመጣ (ለምሳሌ ሌላ ሰራተኛ ካዘጋጀው ወይም አዲስ መልዕክት ሲመጣ) ይታደሳል።
  const [shownInitial, setShownInitial] = useState(initialSuggestion);
  if (initialSuggestion !== shownInitial) {
    setShownInitial(initialSuggestion);
    setSuggestion(initialSuggestion);
  }

  const send = (value: string, fromSuggestion: boolean) => {
    const message = value.trim();
    if (!message || !ready) return;
    startSending(async () => {
      const data = new FormData();
      data.set("id", chatId);
      data.set("text", message);
      const result = await sendTelegramReplyAction(data);
      if (result.ok) {
        toast.success(t(result.message));
        if (fromSuggestion) setSuggestion(null);
        else setText("");
        router.refresh();
      } else {
        toast.error(t(result.message));
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-card p-2">
      {aiEnabled && ready && (suggestion || suggesting) ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-primary/10 p-2 text-sm ring-1 ring-primary/30">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--tg-link,var(--primary))]">
            <SparklesIcon className="size-3" />
            {t("AI suggestion: check before sending")}
          </span>
          {suggesting ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircleIcon className="size-3 animate-spin" />
              {t("AI is writing a reply…")}
            </span>
          ) : (
            <>
              <p dir="auto" className="break-words whitespace-pre-line">
                {suggestion}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Button type="button" variant="ghost" size="xs" onClick={() => void suggest(true)} disabled={sending}>
                  <RefreshCwIcon />
                  {t("Another suggestion")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setText(suggestion ?? "");
                    setSuggestion(null);
                  }}
                  disabled={sending}
                >
                  <PencilIcon />
                  {t("Edit")}
                </Button>
                <Button type="button" size="xs" onClick={() => send(suggestion ?? "", true)} disabled={sending}>
                  <SendIcon />
                  {t("Send")}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {ready ? (
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(text, false);
          }}
        >
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(text, false);
              }
            }}
            rows={1}
            maxLength={4000}
            dir="auto"
            aria-label={t("Write a message")}
            placeholder={t("Write a message…")}
            className="max-h-36 min-h-10 flex-1 resize-none rounded-xl bg-muted px-3 py-2.5 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {aiEnabled && !suggestion && !suggesting ? (
            <Button type="button" variant="ghost" size="icon" onClick={() => void suggest(true)} aria-label={t("Suggest a reply with AI")} title={t("Suggest a reply with AI")}>
              <SparklesIcon />
            </Button>
          ) : null}
          <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label={t("Send")} title={t("Send")} className={cn(sending && "opacity-70")}>
            {sending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
          </Button>
        </form>
      ) : (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {state === "botNotAllowed"
            ? t("To reply from here, turn on the bot's Reply permission: Telegram → Settings → Telegram Business → Chatbots → @ethiocs_monitor_bot.")
            : t("Telegram only allows replies within 24 hours of the person's last message. Ask them to write first.")}
        </p>
      )}
    </div>
  );
}
