import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChatView } from "@/components/telegram/chat-view";
import { FolderBar } from "@/components/telegram/folder-bar";
import { Inbox } from "@/components/telegram/inbox";
import { TelegramHeader } from "@/components/telegram/telegram-header";
import { TelegramWorkspace } from "@/components/telegram/workspace";
import { pageTitle } from "@/lib/i18n-server";
import { requireTelegramViewer } from "@/lib/telegram/access";
import { inboxQuery, parseInboxParams } from "@/lib/telegram/folders";
import { getInbox } from "@/lib/telegram/inbox";
import { readLayoutPrefs } from "@/lib/telegram/layout-prefs";
import { getTelegramChat } from "@/lib/telegram/queries";

export const generateMetadata = pageTitle("Telegram chat");

/** "ይህንን ቻት ተንትን" አዝራሩ Claude እስኪጨርስ ይጠብቃል። */
export const maxDuration = 300;

export default async function AdminTelegramChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireTelegramViewer();
  const { id } = await params;
  const inboxParams = parseInboxParams(await searchParams);
  if (!viewer.can.alerts && inboxParams.folder === "alerts") inboxParams.folder = "all";
  const store = await cookies();
  const prefs = readLayoutPrefs((name) => store.get(name)?.value);
  const now = new Date();
  const [chat, inbox] = await Promise.all([getTelegramChat(id), getInbox(inboxParams, prefs.period)]);
  if (!chat) notFound();

  return (
    <>
      <AutoRefresh intervalMs={20000} />
      {/* በስልክ ላይ ቻቱ ብቻ ይታያል፤ ዝርዝሩ በ"ተመለስ" ቀስት ይመጣል። */}
      <TelegramWorkspace
        mode="chat"
        initialStatsOpen={prefs.statsOpen}
        initialListWidth={prefs.listWidth}
        stats={viewer.can.analytics ? <TelegramHeader inbox={inbox} showAlerts={viewer.can.alerts} /> : null}
        folders={<FolderBar inbox={inbox} params={inboxParams} basePath={`/admin/telegram/${id}`} hidden={viewer.can.alerts ? [] : ["alerts"]} />}
        list={<Inbox inbox={inbox} params={inboxParams} basePath={`/admin/telegram/${id}`} selectedId={id} now={now} showAlerts={viewer.can.alerts} />}
        main={<ChatView chat={chat} backHref={`/admin/telegram${inboxQuery(inboxParams)}`} now={now} viewer={viewer} />}
      />
    </>
  );
}
