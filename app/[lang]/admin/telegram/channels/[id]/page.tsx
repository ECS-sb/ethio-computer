import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocaleLink } from "@/components/i18n-provider";
import { ChannelCard } from "@/components/telegram/channel-card";
import { ChatView } from "@/components/telegram/chat-view";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";
import { getLinkCandidates, getTelegramChannel, getTelegramChat } from "@/lib/telegram/queries";
import { telegramTheme } from "@/lib/telegram/theme";

export const generateMetadata = pageTitle("Channel");

/** "ይህንን ቻት ተንትን" አዝራሩ Claude እስኪጨርስ ይጠብቃል። */
export const maxDuration = 300;

/** አንድ ቻናል፦ ከላይ ዋጋዎቹና ትርፉ፣ ከታች የሻጩና የገዢው ቻቶች ጎን ለጎን (ማን ምን እንደተናገረ በአንድ ጊዜ ለማየት)። */
export default async function AdminTelegramChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  await requireAdmin();
  const { id } = await params;
  const channel = await getTelegramChannel(id);
  if (!channel) notFound();
  const now = new Date();
  const [seller, buyer, candidates] = await Promise.all([
    channel.sellerChat ? getTelegramChat(channel.sellerChat.id) : null,
    channel.buyerChat ? getTelegramChat(channel.buyerChat.id) : null,
    channel.sellerChat && channel.buyerChat ? undefined : getLinkCandidates(""),
  ]);
  const backHref = `/admin/telegram/channels/${channel.id}`;

  const column = (label: string, chat: typeof seller, empty: string) => (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase">{label}</h2>
      {chat ? (
        <ChatView chat={chat} backHref={backHref} now={now} />
      ) : (
        <p className="flex min-h-40 items-center justify-center rounded-xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">{empty}</p>
      )}
    </section>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4" style={{ ...telegramTheme, "--tg-offset": "23rem" } as CSSProperties}>
      <AutoRefresh intervalMs={20000} />
      <div className="flex items-center gap-2">
        <LocaleLink href="/admin/telegram/channels" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" />
          {t("All channels")}
        </LocaleLink>
        <h1 className="sr-only">{channel.title}</h1>
      </div>
      <ul>
        <ChannelCard t={t} channel={channel} candidates={candidates} showPairLink={false} />
      </ul>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {column(t("Seller: where the channel came from"), seller, t("No seller linked yet. Use “Link seller” above."))}
        {column(t("Buyer: who the channel goes to"), buyer, t("No buyer linked yet. Use “Link buyer” above."))}
      </div>
    </div>
  );
}
