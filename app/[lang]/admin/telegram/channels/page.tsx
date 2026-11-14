import { cookies } from "next/headers";
import { ChannelCard } from "@/components/telegram/channel-card";
import { PeriodPicker } from "@/components/telegram/period-picker";
import { formatPrice } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireTelegramViewer } from "@/lib/telegram/access";
import { channelMoney, summarizeChannels } from "@/lib/telegram/channels";
import { readLayoutPrefs } from "@/lib/telegram/layout-prefs";
import { periodStart } from "@/lib/telegram/periods";
import { getLinkCandidates, getTelegramChannels } from "@/lib/telegram/queries";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Channels & profit");

/**
 * ድርጅቱ ከሻጮች ወስዶ ለገዢዎች የሸጣቸው ቻናሎች፦ በተመረጠው ጊዜ የገባው ብር (ተመላሹ ተቀንሶ)፣ ለሻጮች የተከፈለው፣ ትርፉ።
 * ትርፉ የሚቆጠረው ገዢው ከከፈለ በኋላ ነው፤ የተገዛበት ዋጋ ያልታወቀ ቻናል ትርፍ ውስጥ አይገባም (ለብቻው ይቆጠራል)።
 */
export default async function AdminTelegramChannelsPage() {
  const t = await getT();
  await requireTelegramViewer("profit");
  const store = await cookies();
  const { period } = readLayoutPrefs((name) => store.get(name)?.value);
  const since = periodStart(period);
  const [channels, candidates] = await Promise.all([getTelegramChannels(since), getLinkCandidates("")]);
  const sold = channels.filter((channel) => channel.soldAt && channel.soldAt >= since && channelMoney(channel).realized);
  const open = channels.filter((channel) => !sold.includes(channel) && channel.saleStatus !== "CANCELLED");
  const totals = summarizeChannels(sold);

  const tiles = [
    { label: t("Money received (after refunds)"), value: formatPrice(t, totals.revenue) },
    { label: t("Paid to sellers"), value: formatPrice(t, totals.cost) },
    { label: t("Profit"), value: formatPrice(t, totals.profit), tone: totals.profit < 0 ? "bad" : "good" },
    { label: t("Refunded"), value: formatPrice(t, totals.refunded), tone: totals.refunded > 0 ? "bad" : undefined },
    { label: t("Channels sold"), value: totals.sold },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{t("Channels & profit")}</h1>
        <PeriodPicker initialPeriod={period} telegramColors={false} />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-xl bg-card/70 p-5 ring-1 ring-foreground/10">
            <span className={cn("text-2xl font-semibold", tile.tone === "bad" ? "text-destructive" : tile.tone === "good" ? "text-[#7bc862]" : "text-primary")}>
              {tile.value}
            </span>
            <span className="text-sm text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>
      {totals.missingCost > 0 ? (
        <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {t("{count} sold channels have no purchase price, so their profit is not counted yet. Open them and add the price they were bought for.", { count: totals.missingCost })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("Found by AI from the seller and buyer chats. Prices you edit are kept.")}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("Sold")}</h2>
        {sold.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No channels sold in this period.")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sold.map((channel) => (
              <ChannelCard key={channel.id} t={t} channel={channel} candidates={candidates} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t("In progress")}</h2>
        {open.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No channels in progress.")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((channel) => (
              <ChannelCard key={channel.id} t={t} channel={channel} candidates={candidates} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
