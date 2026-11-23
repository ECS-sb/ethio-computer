import { ArrowLeftIcon, CheckIcon, DownloadIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { BroadcastComposer } from "@/components/telegram/broadcast-composer";
import { CopyButton } from "@/components/telegram/copy-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { canUseSchool, requireSchoolViewer } from "@/lib/telegram/access";
import { BROADCAST_LIMIT } from "@/lib/telegram/broadcast";
import { chatListTime } from "@/lib/telegram/format";
import { SCHOOL_ANALYTICS, SCHOOL_INBOX } from "@/lib/telegram/permissions";
import { getStudents, listBroadcasts, listStaffNames, segmentCounts } from "@/lib/telegram/school";
import { inSegment, isSegment, segmentHints, segmentLabels, SEGMENTS, type Segment } from "@/lib/telegram/school-rules";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("Telegram marketing");

/** ለብዙ ተማሪዎች መልዕክት መላክ እስከ 5 ደቂቃ ሊወስድ ይችላል። */
export const maxDuration = 300;

const SHOWN = 200;

const stageVariant = { new: "outline", interested: "secondary", linkSent: "default", registered: "default", paid: "default", quiet: "outline" } as const;

export default async function SchoolMarketingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const viewer = await requireSchoolViewer("marketing", "/admin/telegram/school/marketing");
  const params = await searchParams;
  const requested = typeof params.segment === "string" ? params.segment : "";
  const segment: Segment = isSegment(requested) ? requested : "followUp";
  const now = new Date();
  const [students, broadcasts, staff] = await Promise.all([getStudents(now), listBroadcasts(), listStaffNames()]);
  const counts = segmentCounts(students);
  const members = students.filter((student) => inSegment(segment, student.stage, student.followUp));
  const reachable = members.filter((student) => student.canSend);
  const manual = members.filter((student) => !student.canSend);
  const manualUsernames = manual.filter((student) => student.username).map((student) => `@${student.username}`);
  const staffNames = new Map(staff.map((member) => [member.id, member.name]));
  const withPhone = members.filter((student) => student.phones.length > 0).length;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <LocaleLink href={SCHOOL_INBOX} className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
            {t("School Telegram")}
          </LocaleLink>
          {canUseSchool(viewer, "schoolAnalytics") ? (
            <LocaleLink href={SCHOOL_ANALYTICS} className="hover:text-foreground">
              {t("School analytics")}
            </LocaleLink>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold">{t("Telegram marketing")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("Students are grouped by where they are: new, interested, about to buy, registered, paid or gone quiet. Pick a group and send everyone one message, with their own name in it.")}
        </p>
      </div>

      <nav aria-label={t("Student groups")} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {SEGMENTS.map((option) => (
          <LocaleLink
            key={option}
            href={`/admin/telegram/school/marketing?segment=${option}`}
            aria-current={option === segment ? "true" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm ring-1 transition-colors",
              option === segment ? "bg-primary text-primary-foreground ring-primary" : "text-muted-foreground ring-foreground/15 hover:text-foreground"
            )}
          >
            {t(segmentLabels[option])}
            <span className={cn("rounded-full px-2 text-xs font-semibold", option === segment ? "bg-primary-foreground/15" : "bg-muted")}>{counts[option]}</span>
          </LocaleLink>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground">{t(segmentHints[segment])}</p>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[
          { label: t("In this group"), value: members.length },
          { label: t("Can be messaged now"), value: reachable.length, hint: t("Telegram lets the bot write only to people who wrote in the last 24 hours.") },
          { label: t("Need a message from the phone"), value: manual.length },
          { label: t("With a phone number"), value: withPhone },
        ].map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10" title={tile.hint}>
            <span className="text-3xl font-semibold text-primary">{tile.value}</span>
            <span className="text-sm text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("Send to {group}", { group: t(segmentLabels[segment]) })}</h2>
            <p className="text-xs text-muted-foreground">
              {t("Sent from the school's Telegram account to the students who wrote in the last 24 hours (up to {limit} at a time).", { limit: BROADCAST_LIMIT })}
            </p>
          </div>
          <BroadcastComposer segment={segment} reachable={Math.min(reachable.length, BROADCAST_LIMIT)} sampleName={reachable[0]?.name ?? members[0]?.name ?? null} />
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("Message from the phone")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("{count} students in this group last wrote more than 24 hours ago. Telegram only lets you message them yourself: copy their usernames, or download the list with phone numbers.", { count: manual.length })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {manualUsernames.length > 0 ? (
              <span className="flex items-center gap-1 rounded-xl bg-muted/60 py-1 ps-3 pe-1 text-sm">
                {t("{count} usernames", { count: manualUsernames.length })}
                <CopyButton value={manualUsernames.join("\n")} label={t("Usernames")} />
              </span>
            ) : null}
            <a href={`/api/telegram/school/export?segment=${segment}`} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ring-1 ring-foreground/15 transition-colors hover:bg-accent">
              <DownloadIcon className="size-4" />
              {t("Download list (CSV)")}
            </a>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Students in this group")}</h2>
        {members.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("Nobody is in this group right now.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card/70 ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Student")}</TableHead>
                  <TableHead>{t("Stage")}</TableHead>
                  <TableHead>{t("Last message")}</TableHead>
                  <TableHead>{t("Staff")}</TableHead>
                  <TableHead className="text-center">{t("Can message now")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.slice(0, SHOWN).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <LocaleLink href={`/admin/telegram/${student.id}?category=school`} className="flex flex-col hover:underline">
                        <span className="font-medium">{student.name}</span>
                        {student.username ? (
                          <span dir="ltr" className="text-xs text-muted-foreground">
                            @{student.username}
                          </span>
                        ) : null}
                      </LocaleLink>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <Badge variant={stageVariant[student.stage]}>{t(segmentLabels[student.stage])}</Badge>
                        {student.followUp ? <Badge variant="destructive">{t("Follow up")}</Badge> : null}
                        {student.waitingForUs ? <Badge variant="outline">{t("Waiting for a reply")}</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground" title={formatDateTime(student.lastMessageAt)}>
                      {chatListTime(student.lastMessageAt, now)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.ownerStaffId ? (staffNames.get(student.ownerStaffId) ?? "—") : "—"}</TableCell>
                    <TableCell className="text-center">
                      {student.canSend ? <CheckIcon className="mx-auto size-4 text-[#7bc862]" aria-label={t("Yes")} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {members.length > SHOWN ? <p className="p-3 text-center text-xs text-muted-foreground">{t("Showing {shown} of {count}. Download the list to see everyone.", { shown: SHOWN, count: members.length })}</p> : null}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Sent messages")}</h2>
        {broadcasts.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No marketing messages sent yet.")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {broadcasts.map((broadcast) => (
              <li key={broadcast.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{isSegment(broadcast.segment) ? t(segmentLabels[broadcast.segment]) : broadcast.segment}</Badge>
                    <span className="text-muted-foreground">
                      {broadcast.createdByName} · {formatDateTime(broadcast.createdAt)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {t("Sent {sent}", { sent: broadcast.sentCount })} · <span className="font-semibold text-foreground">{t("Replied {replied}", { replied: broadcast.replied })}</span>
                    {broadcast.failedCount > 0 ? ` · ${t("Failed {failed}", { failed: broadcast.failedCount })}` : ""}
                    {broadcast.skippedCount > 0 ? ` · ${t("Over 24 hours {skipped}", { skipped: broadcast.skippedCount })}` : ""}
                  </span>
                </div>
                <p dir="auto" className="line-clamp-3 text-sm break-words whitespace-pre-line text-muted-foreground">
                  {broadcast.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
