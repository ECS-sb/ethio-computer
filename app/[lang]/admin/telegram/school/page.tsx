import Image from "next/image";
import { ArrowLeftIcon, MegaphoneIcon } from "lucide-react";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reattributeSchoolAction, saveStaffRulesAction } from "@/lib/actions";
import { formatDateTime, formatPrice } from "@/lib/catalog";
import { localePath, type T } from "@/lib/i18n";
import { getLocale, getT, pageTitle } from "@/lib/i18n-server";
import { canUseSchool, requireSchoolViewer } from "@/lib/telegram/access";
import { paymentLabel } from "@/lib/telegram/labels";
import { SCHOOL_INBOX, SCHOOL_MARKETING } from "@/lib/telegram/permissions";
import { ADMIN_KEY, getSchoolAnalytics, type SchoolAnalytics } from "@/lib/telegram/school";
import { parseRange, presetLabels, RANGE_PRESETS } from "@/lib/telegram/school-range";
import { formatClock, segmentHints, segmentLabels, SEGMENTS } from "@/lib/telegram/school-rules";
import { cn } from "@/lib/utils";

export const generateMetadata = pageTitle("School analytics");

function staffLabel(t: T, row: { key: string; name: string | null }): string {
  return row.name ?? (row.key === ADMIN_KEY ? t("Owner (website)") : t("Not identified"));
}

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function Tile({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "money" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10" title={hint}>
      <span className={cn("truncate text-2xl font-semibold", tone === "money" ? "text-[#7bc862]" : "text-primary")}>{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function AttributionNote({ t, data }: { t: T; data: SchoolAnalytics["attribution"] }) {
  const { total, identified, sources } = data;
  const parts = [
    { label: t("from the website"), value: sources.WEB },
    { label: t("by signature"), value: sources.SIGNATURE },
    { label: t("by assigned student"), value: sources.CHAT_OWNER },
    { label: t("by working hours"), value: sources.SHIFT },
  ].filter((part) => part.value > 0);
  return (
    <p className={cn("rounded-xl p-4 text-sm ring-1", sources.none > 0 ? "bg-primary/5 ring-primary/30" : "bg-card/70 ring-foreground/10")}>
      <span className="font-semibold">{t("{identified} of {total} replies are matched to a staff member.", { identified, total })}</span>{" "}
      {parts.length > 0 ? <span className="text-muted-foreground">({parts.map((part) => `${part.value} ${part.label}`).join(", ")})</span> : null}{" "}
      {sources.none > 0 ? (
        <span className="text-muted-foreground">
          {t("Telegram doesn't tell bots which phone or device sent a message. To match the rest, staff can reply from the website, add their signature, or you can set their working hours below.")}
        </span>
      ) : null}
    </p>
  );
}

export default async function SchoolAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const locale = await getLocale();
  const viewer = await requireSchoolViewer("schoolAnalytics", "/admin/telegram/school");
  const range = parseRange(await searchParams);
  const data = await getSchoolAnalytics(range);
  const { totals } = data;
  const maxHour = Math.max(1, ...data.hours);
  const staffColumns = data.staffRows.filter((row) => row.replies > 0 || row.etb > 0);
  const receiptGroups = data.staffRows.filter((row) => row.receipts.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <LocaleLink href={SCHOOL_INBOX} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
            {t("School Telegram")}
          </LocaleLink>
          <h1 className="text-3xl font-semibold">{t("School analytics")}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("Who replied, who sent the registration link, who registered and paid, and how much money came in, for each staff member.")}
          </p>
        </div>
        {canUseSchool(viewer, "marketing") ? (
          <LocaleLink href={SCHOOL_MARKETING} className={buttonVariants({ variant: "outline" })}>
            <MegaphoneIcon />
            {t("Marketing")}
          </LocaleLink>
        ) : null}
      </div>

      {/* የቀን ክልል፦ ቶሎ የሚመረጡ እና ከ…እስከ */}
      <section aria-label={t("Date range")} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => (
            <LocaleLink
              key={preset}
              href={`/admin/telegram/school?range=${preset}`}
              aria-current={range.preset === preset ? "true" : undefined}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm ring-1 transition-colors",
                range.preset === preset ? "bg-primary text-primary-foreground ring-primary" : "text-muted-foreground ring-foreground/15 hover:text-foreground"
              )}
            >
              {t(presetLabels[preset])}
            </LocaleLink>
          ))}
        </div>
        <form action={localePath(locale, "/admin/telegram/school")} className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-from">{t("From")}</Label>
            <Input id="range-from" name="from" type="date" defaultValue={range.fromKey} required className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="range-to">{t("To")}</Label>
            <Input id="range-to" name="to" type="date" defaultValue={range.toKey} required className="w-44" />
          </div>
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            {t("Show")}
          </button>
        </form>
      </section>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
        <Tile label={t("Telegram users (all time)")} value={totals.users} />
        <Tile label={t("New users")} value={totals.newUsers} />
        <Tile label={t("People who messaged")} value={totals.activePeople} />
        <Tile label={t("Waiting for a reply now")} value={data.waitingNow} />
        <Tile label={t("Messages received")} value={totals.inbound} />
        <Tile label={t("Replies sent")} value={totals.outbound} />
        <Tile label={t("Registration links sent")} value={totals.links} />
        <Tile label={t("Said they registered")} value={totals.registered} />
        <Tile label={t("Students who paid")} value={totals.paidStudents} />
        <Tile label={t("Money in")} value={formatPrice(t, totals.etb)} tone="money" />
        <Tile label={t("New users who paid")} value={percent(totals.conversion)} hint={t("Of the new users in this period, how many have paid so far.")} />
        <Tile
          label={t("Average days to pay")}
          value={totals.averageDaysToPay === null ? "—" : t("{days} days", { days: Math.round(totals.averageDaysToPay * 10) / 10 })}
          hint={t("From their first message to their payment.")}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{t("By staff")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("Registrations, payments and receipts count for the staff member who brought the student: the one you assigned, otherwise the one who sent the last registration link, otherwise the one who replied most.")}
          </p>
        </div>
        <AttributionNote t={t} data={data.attribution} />
        <div className="overflow-x-auto rounded-xl bg-card/70 ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Staff")}</TableHead>
                <TableHead className="text-end">{t("Replies")}</TableHead>
                <TableHead className="text-end">{t("Chats")}</TableHead>
                <TableHead className="text-end">{t("Links sent")}</TableHead>
                <TableHead className="text-end">{t("Registered")}</TableHead>
                <TableHead className="text-end">{t("Paid")}</TableHead>
                <TableHead className="text-end">{t("Receipts")}</TableHead>
                <TableHead className="text-end">{t("Money in")}</TableHead>
                <TableHead className="text-end">{t("Share")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.staffRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {t("No staff added yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                data.staffRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className={cn("font-semibold", row.name ? "" : "text-muted-foreground")}>{staffLabel(t, row)}</TableCell>
                    <TableCell className="text-end">{row.replies}</TableCell>
                    <TableCell className="text-end">{row.chats}</TableCell>
                    <TableCell className="text-end">{row.links}</TableCell>
                    <TableCell className="text-end">{row.registered}</TableCell>
                    <TableCell className="text-end">{row.paidStudents}</TableCell>
                    <TableCell className="text-end">{row.receipts.length}</TableCell>
                    <TableCell className="text-end font-semibold">{formatPrice(t, row.etb)}</TableCell>
                    <TableCell className="text-end">{percent(row.share)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Day by day")}</h2>
        <div className="overflow-x-auto rounded-xl bg-card/70 ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Date")}</TableHead>
                <TableHead className="text-end">{t("New users")}</TableHead>
                <TableHead className="text-end">{t("Received")}</TableHead>
                <TableHead className="text-end">{t("Replies")}</TableHead>
                <TableHead className="text-end">{t("Links sent")}</TableHead>
                <TableHead className="text-end">{t("Registered")}</TableHead>
                <TableHead className="text-end">{t("Paid")}</TableHead>
                <TableHead className="text-end">{t("Money in")}</TableHead>
                {staffColumns.map((row) => (
                  <TableHead key={row.key} className="text-end">
                    {staffLabel(t, row)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.days].reverse().map((day) => (
                <TableRow key={day.day}>
                  <TableCell className="whitespace-nowrap" dir="ltr">
                    {day.day}
                  </TableCell>
                  <TableCell className="text-end">{day.newUsers}</TableCell>
                  <TableCell className="text-end">{day.inbound}</TableCell>
                  <TableCell className="text-end">{day.outbound}</TableCell>
                  <TableCell className="text-end">{day.links}</TableCell>
                  <TableCell className="text-end">{day.registered}</TableCell>
                  <TableCell className="text-end">{day.paidStudents}</TableCell>
                  <TableCell className="text-end font-semibold">{formatPrice(t, day.etb)}</TableCell>
                  {staffColumns.map((row) => {
                    const cell = day.byStaff[row.key];
                    return (
                      <TableCell key={row.key} className="text-end text-xs whitespace-nowrap text-muted-foreground">
                        {t("{count} replies", { count: cell?.replies ?? 0 })}
                        {cell?.etb ? <span className="block font-semibold text-foreground">{formatPrice(t, cell.etb)}</span> : null}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("When students write")}</h2>
            <p className="text-xs text-muted-foreground">{t("Messages received by hour (Addis Ababa time). Send marketing messages when most students are online.")}</p>
          </div>
          <div className="flex h-40 items-end gap-1" role="img" aria-label={t("Messages received by hour (Addis Ababa time). Send marketing messages when most students are online.")}>
            {data.hours.map((count, hour) => (
              <div key={hour} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${String(hour).padStart(2, "0")}:00 · ${count}`}>
                <div className="rounded-t-md bg-primary/80" style={{ height: `${Math.max(2, (count / maxHour) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground" dir="ltr" aria-hidden>
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{t("Students now")}</h2>
            <p className="text-xs text-muted-foreground">{t("Where every student is right now, whatever dates you chose above.")}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SEGMENTS.map((segment) => {
              const body = (
                <>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{t(segmentLabels[segment])}</span>
                    <span className="text-lg font-semibold text-primary">{data.segments[segment]}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{t(segmentHints[segment])}</span>
                </>
              );
              return (
                <li key={segment}>
                  {canUseSchool(viewer, "marketing") ? (
                    <LocaleLink href={`${SCHOOL_MARKETING}?segment=${segment}`} className="flex h-full flex-col gap-1 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-accent">
                      {body}
                    </LocaleLink>
                  ) : (
                    <div className="flex h-full flex-col gap-1 rounded-xl bg-muted/50 p-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* የተሸጠበት ማስረጃ፦ ተማሪዎቹ የላኩት የክፍያ ደረሰኝ ፎቶዎች፣ ተማሪውን ባመጣው ሰራተኛ ተለይተው */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{t("Payment screenshots by staff")}</h2>
          <p className="text-xs text-muted-foreground">{t("Receipts students sent in this period. Tap one to open the chat at that message.")}</p>
        </div>
        {receiptGroups.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No receipts in this period.")}</p>
        ) : (
          receiptGroups.map((row) => (
            <div key={row.key} className="flex flex-col gap-3 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <h3 className="font-semibold">
                {staffLabel(t, row)} · {t("{count} receipts", { count: row.receipts.length })}
              </h3>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {row.receipts.slice(0, 60).map((receipt) => (
                  <li key={receipt.messageId}>
                    <LocaleLink href={`/admin/telegram/${receipt.chatId}?category=school#m-${receipt.messageId}`} className="flex flex-col gap-1 rounded-xl p-1 transition-colors hover:bg-accent">
                      <Image
                        unoptimized
                        src={`/api/telegram/media/${receipt.messageId}`}
                        alt={t("Receipt")}
                        width={200}
                        height={200}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl bg-muted object-cover"
                      />
                      <span className="truncate text-sm font-medium">{receipt.chatName}</span>
                      <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        {receipt.amountEtb === null ? "—" : formatPrice(t, receipt.amountEtb)}
                        {receipt.toCompany === false ? <Badge variant="destructive">{t(paymentLabel(false))}</Badge> : null}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(receipt.sentAt)}</span>
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* የመለሰውን ሰራተኛ መለያ መንገዶች፦ ፊርማ እና የስራ ሰዓት (አድሚን ብቻ) */}
      {viewer.isAdmin ? (
        <section id="matching" className="flex scroll-mt-24 flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex max-w-3xl flex-col gap-1">
              <h2 className="text-xl font-semibold">{t("Matching replies to staff")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("Replies sent from this website always show who sent them. For replies from the Telegram app, add a signature that only this person puts in their messages (for example \"- Afran\"), or their working hours if they don't work at the same time. When both work at once, assign each student to one of them from the chat.")}
              </p>
            </div>
            <ActionButton action={reattributeSchoolAction} id="recount" variant="outline">
              {t("Recount the last 90 days")}
            </ActionButton>
          </div>
          {data.staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No staff added yet.")}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.staff.map((member) => (
                <li key={member.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <ActionForm action={saveStaffRulesAction} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_9rem_9rem_auto]">
                    <input type="hidden" name="id" value={member.id} />
                    <span className={cn("font-semibold", member.active ? "" : "text-muted-foreground")}>{member.name}</span>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`sig-${member.id}`}>{t("Signature in their messages")}</Label>
                      <Input id={`sig-${member.id}`} name="signature" defaultValue={member.signature ?? ""} maxLength={40} placeholder={t("For example: - Afran")} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`start-${member.id}`}>{t("Starts work")}</Label>
                      <Input id={`start-${member.id}`} name="shiftStart" type="time" defaultValue={formatClock(member.shiftStart)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`end-${member.id}`}>{t("Ends work")}</Label>
                      <Input id={`end-${member.id}`} name="shiftEnd" type="time" defaultValue={formatClock(member.shiftEnd)} />
                    </div>
                    <SubmitButton variant="outline">{t("Save")}</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

    </>
  );
}
