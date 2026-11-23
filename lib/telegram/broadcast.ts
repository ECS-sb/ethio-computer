import "server-only";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/marketplace";
import { sendBroadcastMessage } from "@/lib/telegram/outbox";
import { getStudents } from "@/lib/telegram/school";
import { inSegment, personalize, type Segment } from "@/lib/telegram/school-rules";

/** በአንድ ጊዜ የሚላከው ከፍተኛ ብዛት (ገጹ እስከ 5 ደቂቃ ይጠብቃል፤ ቴሌግራም በሰከንድ ~30 መልዕክት ይፈቅዳል)። */
export const BROADCAST_LIMIT = 300;
const PAUSE_MS = 60;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ለአንድ ቡድን ተማሪዎች መልዕክት ይልካል፦ ቴሌግራም ቦቱ በድርጅቱ ስም እንዲልክ የሚፈቅደው ባለፉት 24 ሰዓታት የጻፉትን ብቻ ስለሆነ
 * ሌሎቹ ይዘለላሉ (ቁጥራቸው ይመዘገባል፤ በገጹ ላይ የusernameቸው ዝርዝር ለእጅ መላኪያ አለ)። {name} በመጀመሪያ ስማቸው ይተካል።
 */
export async function sendBroadcast(segment: Segment, text: string, sender: { userId: string; name: string }) {
  const students = (await getStudents()).filter((student) => inSegment(segment, student.stage, student.followUp));
  const reachable = students.filter((student) => student.canSend).slice(0, BROADCAST_LIMIT);
  if (reachable.length === 0) throw new DomainError("Nobody in this group wrote in the last 24 hours, so Telegram won't let the bot message them.");
  const broadcast = await db.telegramBroadcast.create({
    data: { segment, text, createdByName: sender.name.slice(0, 80), skippedCount: students.length - reachable.length },
  });
  const delivered: string[] = [];
  let failed = 0;
  for (const student of reachable) {
    if (await sendBroadcastMessage(student.id, personalize(text, student.name), sender, broadcast.id)) delivered.push(student.id);
    else failed += 1;
    await pause(PAUSE_MS);
  }
  await db.telegramBroadcast.update({ where: { id: broadcast.id }, data: { sentCount: delivered.length, failedCount: failed, recipientIds: delivered } });
  return { sent: delivered.length, failed, skipped: students.length - reachable.length };
}
