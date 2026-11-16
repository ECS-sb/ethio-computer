"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpIcon, MessageCircleQuestionIcon, XIcon } from "lucide-react";
import { LocaleLink, useLocale, useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/messages";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "assistant-chat";
const ERROR_MARK = "\u0000";

const suggestions: MessageKey[] = ["How do I buy an account?", "How do I sell my account?", "What are the fees?", "How do I add money to my wallet?", "How do I get verified?"];

// መልሱ ውስጥ ያሉ የሳይቱ አድራሻዎች (ለምሳሌ /sell) ተጫኝ ሊንክ ይሆናሉ።
const PATH_PATTERN = /(\/(?:accounts|sell|login|contact|faq|how-it-works|dashboard(?:\/[a-z-]+)*)\b)/g;

function Linkified({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  return text.split(PATH_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <LocaleLink key={index} href={part} onClick={onNavigate} className="font-semibold text-primary underline underline-offset-2">
        {part}
      </LocaleLink>
    ) : (
      part
    )
  );
}

function loadMessages(): Message[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.slice(-20) : [];
  } catch {
    return [];
  }
}

/** ከታች በቀኝ ያለው የAI ረዳት፦ ሰዎች ሲቸገሩ በቀላል ቋንቋ ይመልሳል። በስልክ ላይ ሙሉ ስክሪን ይይዛል። */
export function AssistantWidget() {
  const t = useT();
  const siteLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "am">(siteLocale === "am" ? "am" : "en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // የቆየው ውይይት የሚነበበው ሲከፈት ነው፤ ከዚያ በፊት ማከማቻው አይነካም።
  const loaded = useRef(false);
  const openChat = () => {
    if (!loaded.current) {
      loaded.current = true;
      setMessages(loadMessages());
    }
    setOpen(true);
  };
  useEffect(() => {
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((message) => message.content && message.content !== ERROR_MARK)));
    } catch {
      // የግል መስኮት ወይም የታገደ ማከማቻ፦ ውይይቱ ገጹ እስኪዘጋ ብቻ ይቆያል።
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const history: Message[] = [...messages.filter((message) => message.content && message.content !== ERROR_MARK), { role: "user" as const, content: question }].slice(-19);
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    let reply = "";
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, messages: history }),
      });
      if (!response.ok || !response.body) throw new Error(String(response.status));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply.trim() || reply.includes(ERROR_MARK)) throw new Error("empty");
    } catch {
      setMessages([...history, { role: "assistant", content: ERROR_MARK }]);
    }
    setBusy(false);
  };

  return (
    <>
      {open ? null : (
        <button
          type="button"
          onClick={openChat}
          aria-label={t("Ask our assistant")}
          className="group fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full bg-linear-to-r from-primary to-gold-2 py-2 pr-4 pl-2 text-sm font-semibold text-primary-foreground shadow-2xl shadow-primary/40 ring-4 ring-background transition-transform hover:scale-105 lg:right-6 lg:bottom-6"
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-primary-foreground/10">
            <span aria-hidden className="absolute inset-0 rounded-full bg-primary-foreground/20 motion-safe:animate-ping motion-safe:[animation-duration:3s]" />
            <MessageCircleQuestionIcon className="relative size-5" />
          </span>
          {t("Need help?")}
        </button>
      )}

      {open ? (
        <section
          role="dialog"
          aria-label={t("Ethio Computer assistant")}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-xl bg-card shadow-2xl shadow-black/60 ring-1 ring-foreground/15 motion-safe:animate-in motion-safe:slide-in-from-bottom-8 motion-safe:fade-in sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,85dvh)] sm:w-[400px] sm:rounded-xl"
        >
          <header className="relative flex items-center gap-4 bg-linear-to-br from-secondary to-card px-4 py-4">
            <div aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-gold-2 shadow-lg shadow-primary/30">
              <Image src="/brand/logo-mark.svg" alt="" width={28} height={28} className="size-7 brightness-0" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading font-bold">Ethio Computer</p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
                {t("AI assistant · replies in seconds")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "am" ? "en" : "am")}
              aria-label={t("Reply language")}
              className="rounded-full bg-background/40"
            >
              {language === "am" ? "English" : "አማርኛ"}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("Close")} className="size-10 rounded-full">
              <XIcon />
            </Button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">{t("Hi! Ask me anything about buying or selling accounts, the wallet or fees. I reply in Amharic or English.")}</p>
            {messages.map((message, index) =>
              message.role === "user" ? (
                <p key={index} className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-primary px-4 py-3 text-sm break-words whitespace-pre-line text-primary-foreground">
                  {message.content}
                </p>
              ) : message.content === ERROR_MARK ? (
                <p key={index} role="alert" className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-destructive/10 px-4 py-3 text-sm ring-1 ring-destructive/40">
                  {t("Sorry, I couldn't answer right now. Try again, or contact us on the Contact page.")}
                </p>
              ) : message.content ? (
                <p key={index} className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-secondary px-4 py-3 text-sm break-words whitespace-pre-line">
                  <Linkified text={message.content} onNavigate={() => setOpen(false)} />
                </p>
              ) : (
                <p key={index} aria-label={t("Writing…")} className="flex gap-1 self-start rounded-xl rounded-tl-sm bg-secondary px-4 py-4">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className={cn("size-2 rounded-full bg-muted-foreground motion-safe:animate-bounce", dot === 1 && "[animation-delay:150ms]", dot === 2 && "[animation-delay:300ms]")} />
                  ))}
                </p>
              )
            )}
            <p className="pt-2 text-center text-xs text-muted-foreground">{t("Answers come from AI and can be wrong. The chat isn't saved. Never share passwords or codes here.")}</p>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => void send(t(suggestion))}
                className="shrink-0 rounded-full bg-background/40 px-4 py-2 text-sm font-medium ring-1 ring-foreground/15 transition-colors hover:bg-primary/15 hover:ring-primary/50 disabled:opacity-50"
              >
                {t(suggestion)}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="flex items-center gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1500}
              placeholder={t("Write your question…")}
              aria-label={t("Write your question…")}
              className="h-12 min-w-0 flex-1 rounded-full bg-secondary px-4 text-base outline-none ring-1 ring-foreground/10 placeholder:text-muted-foreground focus-visible:ring-primary/60 sm:text-sm"
            />
            <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label={t("Send")} className="size-12 shrink-0 rounded-full">
              <ArrowUpIcon className="size-5" />
            </Button>
          </form>
        </section>
      ) : null}
    </>
  );
}
