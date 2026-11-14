"use client";

import { useState } from "react";
import { Link2Icon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTelegramChannelAction, editTelegramChannelAction, linkTelegramChannelsAction } from "@/lib/actions";
import type { ChannelStatus } from "@/lib/telegram/channels";
import { channelStatusLabels } from "@/lib/telegram/labels";
import { telegramTheme } from "@/lib/telegram/theme";

const STATUSES = Object.keys(channelStatusLabels) as ChannelStatus[];

function DialogShell({ title, trigger, open, onOpenChange, children }: { title: string; trigger: React.ReactElement; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      {/* መስኮቱ ከገጹ ውጭ (portal) ስለሚከፈት የቴሌግራም ቀለሞችን በራሱ ይወስዳል። */}
      <DialogContent showCloseButton={false} style={telegramTheme} className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <div className="flex items-center justify-between gap-4">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t("Close")} />}>
            <XIcon />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function MoneyInput({ name, value, id }: { name: string; value: number | null; id: string }) {
  return <Input id={id} name={name} type="number" inputMode="numeric" min={0} step={1} defaultValue={value ?? ""} dir="ltr" />;
}

function StatusSelect({ name, value, id }: { name: string; value: ChannelStatus | null; id: string }) {
  const t = useT();
  const items = [{ value: "", label: "—" }, ...STATUSES.map((status) => ({ value: status, label: t(channelStatusLabels[status]) }))];
  return (
    <Select name={name} items={items} defaultValue={value ?? ""}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent style={telegramTheme}>
        {items.map((item) => (
          <SelectItem key={item.value || "none"} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type EditableChannel = {
  id: string;
  title: string;
  purchasePrice: number | null;
  paidToSellerEtb: number | null;
  sourceStatus: ChannelStatus | null;
  salePrice: number | null;
  buyerPaidEtb: number | null;
  refundedEtb: number;
  saleStatus: ChannelStatus | null;
};

/** ዋጋዎቹን፣ የተከፈለውን፣ ተመላሽ ብሩን እና ሁኔታውን በእጅ ማስተካከያ። የተቀየሩት መስኮች በAI እንደገና አይቀየሩም። */
export function ChannelEditDialog({ channel }: { channel: EditableChannel }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fieldId = (name: string) => `${channel.id}-${name}`;
  return (
    <DialogShell
      title={t("Edit channel")}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="xs">
          <PencilIcon />
          {t("Edit")}
        </Button>
      }
    >
      <ActionForm action={editTelegramChannelAction} onSuccess={() => setOpen(false)} className="flex flex-col gap-4 text-sm">
        <input type="hidden" name="id" value={channel.id} />
        <Field label={t("Channel")} htmlFor={fieldId("title")}>
          <Input id={fieldId("title")} name="title" defaultValue={channel.title} required maxLength={200} dir="auto" />
        </Field>
        <fieldset className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
          <legend className="px-1 text-xs font-semibold">{t("From the seller")}</legend>
          <Field label={t("Bought for (ETB)")} htmlFor={fieldId("purchasePrice")}>
            <MoneyInput id={fieldId("purchasePrice")} name="purchasePrice" value={channel.purchasePrice} />
          </Field>
          <Field label={t("Paid to the seller (ETB)")} htmlFor={fieldId("paidToSellerEtb")}>
            <MoneyInput id={fieldId("paidToSellerEtb")} name="paidToSellerEtb" value={channel.paidToSellerEtb} />
          </Field>
          <div className="col-span-2">
            <Field label={t("Status")} htmlFor={fieldId("sourceStatus")}>
              <StatusSelect id={fieldId("sourceStatus")} name="sourceStatus" value={channel.sourceStatus} />
            </Field>
          </div>
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
          <legend className="px-1 text-xs font-semibold">{t("To the buyer")}</legend>
          <Field label={t("Sold for (ETB)")} htmlFor={fieldId("salePrice")}>
            <MoneyInput id={fieldId("salePrice")} name="salePrice" value={channel.salePrice} />
          </Field>
          <Field label={t("Buyer paid (ETB)")} htmlFor={fieldId("buyerPaidEtb")}>
            <MoneyInput id={fieldId("buyerPaidEtb")} name="buyerPaidEtb" value={channel.buyerPaidEtb} />
          </Field>
          <Field label={t("Refunded (ETB)")} htmlFor={fieldId("refundedEtb")}>
            <MoneyInput id={fieldId("refundedEtb")} name="refundedEtb" value={channel.refundedEtb || null} />
          </Field>
          <Field label={t("Status")} htmlFor={fieldId("saleStatus")}>
            <StatusSelect id={fieldId("saleStatus")} name="saleStatus" value={channel.saleStatus} />
          </Field>
        </fieldset>
        <p className="text-xs text-muted-foreground">{t("Fields you change here are kept even when AI analyzes the chat again.")}</p>
        <SubmitButton>{t("Save")}</SubmitButton>
      </ActionForm>
    </DialogShell>
  );
}

export type LinkCandidate = { id: string; label: string };

/** ሻጭ የሌለውን የገዢ ቻናል ከሻጩ ቻናል ጋር (ወይም በተቃራኒው) ያገናኛል። */
export function ChannelLinkDialog({ channelId, needs, candidates }: { channelId: string; needs: "seller" | "buyer"; candidates: LinkCandidate[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const items = candidates.map((candidate) => ({ value: candidate.id, label: candidate.label }));
  return (
    <DialogShell
      title={needs === "seller" ? t("Which seller was it bought from?") : t("Which buyer was it sold to?")}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="xs">
          <Link2Icon />
          {needs === "seller" ? t("Link seller") : t("Link buyer")}
        </Button>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{needs === "seller" ? t("No unlinked seller channels yet.") : t("No unlinked buyer channels yet.")}</p>
      ) : (
        <ActionForm action={linkTelegramChannelsAction} onSuccess={() => setOpen(false)} className="flex flex-col gap-4 text-sm">
          <input type="hidden" name="id" value={channelId} />
          <Select name="other" items={items} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("Choose a channel")} />
            </SelectTrigger>
            <SelectContent style={telegramTheme}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SubmitButton>{t("Link")}</SubmitButton>
        </ActionForm>
      )}
    </DialogShell>
  );
}

/** AI ያላገኘውን ቻናል በእጅ መጨመሪያ። */
export function ChannelAddDialog({ chatId }: { chatId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fieldId = (name: string) => `${chatId}-new-${name}`;
  const sides = [
    { value: "buyer", label: t("This person buys it from us") },
    { value: "seller", label: t("This person sells it to us") },
  ];
  return (
    <DialogShell
      title={t("Add a channel")}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="xs">
          <PlusIcon />
          {t("Add a channel")}
        </Button>
      }
    >
      <ActionForm action={addTelegramChannelAction} onSuccess={() => setOpen(false)} className="flex flex-col gap-4 text-sm">
        <input type="hidden" name="id" value={chatId} />
        <Select name="side" items={sides} defaultValue="buyer">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={telegramTheme}>
            {sides.map((side) => (
              <SelectItem key={side.value} value={side.value}>
                {side.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Platform")} htmlFor={fieldId("platform")}>
            <Input id={fieldId("platform")} name="platform" required maxLength={40} placeholder="TikTok" />
          </Field>
          <Field label={t("Price (ETB)")} htmlFor={fieldId("price")}>
            <MoneyInput id={fieldId("price")} name="price" value={null} />
          </Field>
        </div>
        <Field label={t("Channel")} htmlFor={fieldId("title")}>
          <Input id={fieldId("title")} name="title" maxLength={200} dir="auto" placeholder={t("For example: TikTok, 10K followers")} />
        </Field>
        <Field label={t("Link or @username")} htmlFor={fieldId("link")}>
          <Input id={fieldId("link")} name="link" maxLength={300} dir="ltr" placeholder="https://www.tiktok.com/@…" />
        </Field>
        <SubmitButton>{t("Save")}</SubmitButton>
      </ActionForm>
    </DialogShell>
  );
}
