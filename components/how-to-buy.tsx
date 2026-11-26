"use client";

import { useState } from "react";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";
import { LocaleLink, useT } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { guides, type GuideAction, type GuideId, type GuideSide } from "@/lib/buying-guides";

/** የመመሪያው መጨረሻ አዝራር፦ በዚያው ገጽ ያለ ክፍል (#…)፣ ሌላ ገጽ ወይም ቴሌግራም። ሲነካ መስኮቱ ይዘጋል። */
function ActionLink({ action, onDone }: { action: GuideAction; onDone: () => void }) {
  const t = useT();
  const className = buttonVariants({ size: "lg", className: "w-full" });
  const content = (
    <>
      {t(action.label)}
      <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" />
    </>
  );
  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" onClick={onDone} className={className}>
        {content}
      </a>
    );
  }
  if (action.href.startsWith("#")) {
    return (
      <a href={action.href} onClick={onDone} className={className}>
        {content}
      </a>
    );
  }
  return (
    <LocaleLink href={action.href} onClick={onDone} className={className}>
      {content}
    </LocaleLink>
  );
}

function Steps({ side, onDone }: { side: GuideSide; onDone: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {side.steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{t(step.title)}</span>
              <span className="text-muted-foreground">{t(step.description)}</span>
            </span>
          </li>
        ))}
      </ol>
      <ActionLink action={side.action} onDone={onDone} />
    </div>
  );
}

/** ትንሽ "እንዴት ይገዛል?" አዝራር፦ ሲነካ የመግዛት (እና የመሸጥ) ደረጃዎችን በዝርዝር ያሳያል፣ ከታች ወዲያው መጀመሪያ አዝራር አለ። */
export function HowToBuy({ guide: id }: { guide: GuideId }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const guide = guides[id];
  const sell = "sell" in guide ? guide.sell : undefined;
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" className="text-primary hover:text-primary" />}>
        <BookOpenIcon data-icon="inline-start" />
        {t(guide.buy.tab)}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t(guide.title)}</DialogTitle>
          <DialogDescription>{t("Follow these steps. Your money is protected at every step.")}</DialogDescription>
        </DialogHeader>
        {sell ? (
          <Tabs defaultValue="buy" className="gap-6">
            <TabsList className="w-full">
              <TabsTrigger value="buy">{t(guide.buy.tab)}</TabsTrigger>
              <TabsTrigger value="sell">{t(sell.tab)}</TabsTrigger>
            </TabsList>
            <TabsContent value="buy">
              <Steps side={guide.buy} onDone={close} />
            </TabsContent>
            <TabsContent value="sell">
              <Steps side={sell} onDone={close} />
            </TabsContent>
          </Tabs>
        ) : (
          <Steps side={guide.buy} onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
