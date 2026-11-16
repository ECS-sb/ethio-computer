"use client";

import { useState } from "react";
import { FlagIcon, MessageCircleIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CompareToggle } from "@/components/compare-toggle";
import { FieldSelect } from "@/components/field-select";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOfferAction, createReportAction, startConversationAction } from "@/lib/actions";
import { formatPrice, handoverOptions, reportReasons } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ListingActions({ id, price, canOffer }: { id: string; price: number; canOffer: boolean }) {
  const t = useT();
  const [offerOpen, setOfferOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("fake");
  const [handover, setHandover] = useState<string>("SELF");

  return (
    <div className="flex flex-col gap-2">
      {canOffer ? (
        <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
          <DialogTrigger render={<Button size="lg" className="w-full" />}>{t("Make an offer")}</DialogTrigger>
          <DialogContent>
            <ActionForm action={createOfferAction} className="flex flex-col gap-6" onSuccess={() => setOfferOpen(false)}>
              <input type="hidden" name="listingId" value={id} />
              <DialogHeader>
                <DialogTitle>{t("Make an offer")}</DialogTitle>
                <DialogDescription>{t("The asking price is {price}.", { price: formatPrice(t, price) })}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="offer-amount">{t("Your offer (ETB)")}</Label>
                <Input id="offer-amount" name="amountEtb" type="number" min={1} step={1} required defaultValue={price} />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="pb-2 text-sm font-medium">{t("How do you want to complete it?")}</legend>
                {handoverOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-4 rounded-xl p-4 ring-1 transition-colors",
                      handover === option.value ? "bg-primary/10 ring-primary/60" : "bg-secondary/40 ring-foreground/10 hover:ring-foreground/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="handover"
                      value={option.value}
                      checked={handover === option.value}
                      onChange={() => setHandover(option.value)}
                      className="mt-1 accent-primary"
                    />
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">
                        {t(option.label)} · <span className="text-primary">{option.feePercent}%</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{t(option.description)}</span>
                    </span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">{t("The fee is paid by the seller. You pay only the agreed price, from your wallet.")}</p>
              </fieldset>
              <div className="flex flex-col gap-2">
                <Label htmlFor="offer-note">{t("Message (optional)")}</Label>
                <Textarea id="offer-note" name="note" maxLength={500} />
              </div>
              <DialogFooter>
                <SubmitButton>{t("Send offer")}</SubmitButton>
              </DialogFooter>
            </ActionForm>
          </DialogContent>
        </Dialog>
      ) : null}

      <ActionForm action={startConversationAction}>
        <input type="hidden" name="listingId" value={id} />
        <SubmitButton variant="outline" size="lg" className="w-full">
          <MessageCircleIcon data-icon="inline-start" />
          {t("Message the seller")}
        </SubmitButton>
      </ActionForm>

      <div className="grid grid-cols-2 gap-2">
        <CompareToggle id={id} />
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger render={<Button variant="ghost" />}>
            <FlagIcon data-icon="inline-start" />
            {t("Report")}
          </DialogTrigger>
          <DialogContent>
            <ActionForm action={createReportAction} className="flex flex-col gap-6" onSuccess={() => setReportOpen(false)}>
              <input type="hidden" name="listingId" value={id} />
              <input type="hidden" name="reason" value={reason} />
              <DialogHeader>
                <DialogTitle>{t("Report this listing")}</DialogTitle>
                <DialogDescription>{t("Choose the problem.")}</DialogDescription>
              </DialogHeader>
              <FieldSelect value={reason} onChange={setReason} options={reportReasons} />
              <DialogFooter>
                <SubmitButton>{t("Send report")}</SubmitButton>
              </DialogFooter>
            </ActionForm>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
