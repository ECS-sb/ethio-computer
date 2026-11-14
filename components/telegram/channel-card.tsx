import { ColumnsIcon, ExternalLinkIcon, UnlinkIcon } from "lucide-react";
import { ActionButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { ChannelEditDialog, ChannelLinkDialog, type LinkCandidate } from "@/components/telegram/channel-dialogs";
import { Badge } from "@/components/ui/badge";
import { unlinkTelegramChannelAction } from "@/lib/actions";
import { formatPrice } from "@/lib/catalog";
import type { T } from "@/lib/i18n";
import { channelMoney, type ChannelStatus } from "@/lib/telegram/channels";
import { channelStatusLabels } from "@/lib/telegram/labels";
import type { ChannelRow } from "@/lib/telegram/queries";
import { cn } from "@/lib/utils";

const statusVariant: Record<ChannelStatus, "default" | "secondary" | "outline" | "destructive"> = {
  NEGOTIATING: "outline",
  AGREED: "secondary",
  PAID: "default",
  DELIVERED: "default",
  REFUNDED: "destructive",
  CANCELLED: "outline",
};

function hrefFor(link: string): string {
  return /^https?:\/\//i.test(link) ? link : link.startsWith("@") ? "" : `https://${link}`;
}

export function candidateLabel(t: T, channel: ChannelRow): string {
  const chat = channel.sellerChat ?? channel.buyerChat;
  const price = channel.sellerChat ? channel.purchasePrice : channel.salePrice;
  return [channel.title, chat?.name, price === null ? null : formatPrice(t, price)].filter(Boolean).join(" · ");
}

function SideBox({
  t,
  label,
  chat,
  currentChatId,
  priceLabel,
  price,
  hidePrice = false,
  paidLabel,
  paid,
  status,
  extra,
}: {
  t: T;
  label: string;
  chat: { id: string; name: string } | null;
  currentChatId: string | null;
  priceLabel: string;
  price: number | null;
  hidePrice?: boolean;
  paidLabel: string;
  paid: number | null;
  status: ChannelStatus | null;
  extra?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg p-2 ring-1 ring-foreground/10", chat?.id === currentChatId && "bg-primary/10")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">{label}</span>
        {status ? <Badge variant={statusVariant[status]}>{t(channelStatusLabels[status])}</Badge> : null}
      </div>
      {chat ? (
        chat.id === currentChatId ? (
          <span className="truncate font-medium">{chat.name}</span>
        ) : (
          <LocaleLink href={`/admin/telegram/${chat.id}`} className="truncate font-medium text-[var(--tg-link,var(--primary))] hover:underline">
            {chat.name}
          </LocaleLink>
        )
      ) : (
        <span className="text-muted-foreground">{t("Not linked yet")}</span>
      )}
      <span className={cn("text-xs text-muted-foreground", hidePrice && "hidden")}>
        {priceLabel}: <span className="font-semibold text-foreground">{price === null ? "—" : formatPrice(t, price)}</span>
        {paid !== null ? (
          <>
            {" · "}
            {paidLabel}: <span className="font-semibold text-foreground">{formatPrice(t, paid)}</span>
          </>
        ) : null}
      </span>
      {extra}
    </div>
  );
}

/**
 * አንድ ቻናል፦ ከየትኛው ሻጭ በስንት እንደተገዛ፣ ለየትኛው ገዢ በስንት እንደተሸጠ፣ ተመላሽ ብር እና ትርፉ።
 * ሁለቱም ቻቶች ሲገናኙ ጎን ለጎን የሚያሳይ ገጽ ይከፈታል።
 */
export function ChannelCard({
  t,
  channel,
  currentChatId = null,
  candidates,
  showPairLink = true,
  showMoney = true,
}: {
  t: T;
  channel: ChannelRow;
  currentChatId?: string | null;
  candidates?: { sellerOnly: ChannelRow[]; buyerOnly: ChannelRow[] };
  showPairLink?: boolean;
  /** false፦ የተገዛበት ዋጋ፣ ለሻጩ የተከፈለው እና ትርፉ ይደበቃሉ፣ ማስተካከልም አይቻልም (ፈቃድ የሌለው ሰራተኛ) */
  showMoney?: boolean;
}) {
  const money = channelMoney(channel);
  const linked = Boolean(channel.sellerChat && channel.buyerChat);
  const needs = !channel.sellerChat ? "seller" : !channel.buyerChat ? "buyer" : null;
  const linkCandidates: LinkCandidate[] = needs
    ? (needs === "seller" ? (candidates?.sellerOnly ?? []) : (candidates?.buyerOnly ?? [])).map((candidate) => ({ id: candidate.id, label: candidateLabel(t, candidate) }))
    : [];
  const href = channel.link ? hrefFor(channel.link) : "";

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 text-sm ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge variant="outline">{channel.platform}</Badge>
        <span dir="auto" className="min-w-0 font-semibold break-words">
          {channel.title}
        </span>
        {channel.link ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer" dir="ltr" className="flex min-w-0 items-center gap-1 text-xs text-[var(--tg-link,var(--primary))] hover:underline">
              <span className="truncate">{channel.link}</span>
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          ) : (
            <span dir="ltr" className="text-xs text-muted-foreground">
              {channel.link}
            </span>
          )
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SideBox
          t={t}
          label={t("Seller")}
          chat={channel.sellerChat}
          currentChatId={currentChatId}
          priceLabel={t("Bought for")}
          price={showMoney ? channel.purchasePrice : null}
          hidePrice={!showMoney}
          paidLabel={t("Paid")}
          paid={showMoney ? channel.paidToSellerEtb : null}
          status={channel.sourceStatus}
        />
        <SideBox
          t={t}
          label={t("Buyer")}
          chat={channel.buyerChat}
          currentChatId={currentChatId}
          priceLabel={t("Sold for")}
          price={channel.salePrice}
          paidLabel={t("Paid")}
          paid={channel.buyerPaidEtb}
          status={channel.saleStatus}
          extra={
            money.refunded > 0 ? (
              <span className="text-xs font-semibold text-destructive">{t("Refunded: {amount}", { amount: formatPrice(t, money.refunded) })}</span>
            ) : null
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!showMoney ? (
          <span />
        ) : !money.realized ? (
          <span className="text-xs text-muted-foreground">{t("Profit is counted once the buyer pays.")}</span>
        ) : money.profit === null ? (
          <span className="text-xs font-medium text-destructive">{t("Profit unknown: add the price it was bought for.")}</span>
        ) : (
          <span className={cn("font-semibold", money.profit < 0 ? "text-destructive" : "text-[#7bc862]")}>
            {t("Profit: {amount}", { amount: formatPrice(t, money.profit) })}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {linked && showPairLink ? (
            <LocaleLink
              href={`/admin/telegram/channels/${channel.id}`}
              className="flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-[var(--tg-link,var(--primary))] ring-1 ring-primary/40 hover:bg-primary/10"
            >
              <ColumnsIcon className="size-3" />
              {t("Both chats side by side")}
            </LocaleLink>
          ) : null}
          {needs ? <ChannelLinkDialog channelId={channel.id} needs={needs} candidates={linkCandidates} /> : null}
          {linked ? (
            <ActionButton action={unlinkTelegramChannelAction} id={channel.id} variant="ghost" size="xs" title={t("Unlink")}>
              <UnlinkIcon />
              {t("Unlink")}
            </ActionButton>
          ) : null}
          {showMoney ? (
            <ChannelEditDialog
              channel={{
                id: channel.id,
                title: channel.title,
                purchasePrice: channel.purchasePrice,
                paidToSellerEtb: channel.paidToSellerEtb,
                sourceStatus: channel.sourceStatus,
                salePrice: channel.salePrice,
                buyerPaidEtb: channel.buyerPaidEtb,
                refundedEtb: channel.refundedEtb,
                saleStatus: channel.saleStatus,
              }}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}
