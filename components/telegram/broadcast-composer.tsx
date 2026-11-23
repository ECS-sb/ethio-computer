"use client";

import { useState } from "react";
import { SendIcon, SparklesIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendSchoolBroadcastAction } from "@/lib/actions";
import type { MessageKey } from "@/lib/messages";
import { personalize, type Segment } from "@/lib/telegram/school-rules";

/** ለእያንዳንዱ ቡድን የሚስማማ የመነሻ መልዕክት (ሰራተኛው አስተካክሎ ይልከዋል)። */
const templates: Record<Segment, MessageKey> = {
  all: "Hi {name}! New classes at Ethio Computer School are starting soon. Reply to this message and we'll send you the details.",
  followUp: "Hi {name}, just checking in. Do you still want to join the course? Reply here and we'll help you register in a few minutes.",
  new: "Hi {name}, welcome to Ethio Computer School! Which course are you interested in? Reply and we'll send you the price and schedule.",
  interested: "Hi {name}, here is where you can register for the course you asked about. Reply if you have any questions.",
  linkSent: "Hi {name}, did you manage to register with the link we sent? If anything didn't work, reply here and we'll help you right away.",
  registered: "Hi {name}, thank you for registering! To start your classes, please complete your payment and send us the receipt here.",
  paid: "Hi {name}, thank you for studying with us! Tell a friend about Ethio Computer School. If they register, let us know who sent them.",
  quiet: "Hi {name}, we haven't heard from you in a while. Classes are starting again. Reply here if you'd like to join this time.",
};

export function BroadcastComposer({ segment, reachable, sampleName }: { segment: Segment; reachable: number; sampleName: string | null }) {
  const t = useT();
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const preview = text.trim() ? personalize(text, sampleName ?? t("Student")) : "";

  return (
    <ActionForm
      action={sendSchoolBroadcastAction}
      onSuccess={() => {
        setText("");
        setConfirming(false);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="segment" value={segment} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="broadcast-text">{t("Message")}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => setText(t(templates[segment]))}>
          <SparklesIcon />
          {t("Use a suggested message")}
        </Button>
      </div>
      <Textarea
        id="broadcast-text"
        name="text"
        required
        maxLength={4000}
        rows={5}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setConfirming(false);
        }}
        placeholder={t("Write the message. {name} becomes each student's first name.")}
        dir="auto"
      />
      <span className="text-xs text-muted-foreground">
        {t("{name} becomes each student's first name.")} · {text.length}/4000
      </span>
      {preview ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">{t("Preview")}</span>
          <p dir="auto" className="max-w-md self-end rounded-xl bg-[var(--tg-bubble-out,var(--primary))] px-3 py-2 text-sm break-words whitespace-pre-line text-white">
            {preview}
          </p>
        </div>
      ) : null}
      {reachable === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Nobody in this group wrote in the last 24 hours, so Telegram won't let the bot message them.")}</p>
      ) : confirming ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm">{t("Send this to {count} students now?", { count: reachable })}</span>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            {t("Cancel")}
          </Button>
          <SubmitButton>
            <SendIcon />
            {t("Yes, send")}
          </SubmitButton>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" disabled={!text.trim()} onClick={() => setConfirming(true)}>
            <SendIcon />
            {t("Send to {count} students", { count: reachable })}
          </Button>
        </div>
      )}
    </ActionForm>
  );
}
