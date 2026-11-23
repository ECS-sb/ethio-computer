import { createT } from "@/lib/i18n";
import { canUseSchool, getTelegramViewer } from "@/lib/telegram/access";
import { getStudents, listStaffNames } from "@/lib/telegram/school";
import { addisDayKey } from "@/lib/telegram/school-range";
import { inSegment, isSegment, segmentLabels } from "@/lib/telegram/school-rules";

/** Excel ቀመር (=, +, -, @) ሆኖ እንዳይሮጥ እና ኮማ/ጥቅስ ያለበት ጽሑፍ እንዳይሰበር። */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * የትምህርት ቤቱ ተማሪዎች ዝርዝር (ስልክ ቁጥሮችን ጨምሮ) ለማርኬቲንግ፦ ?segment=followUp። የማርኬቲንግ ፈቃድ ያለው ብቻ።
 * ፋይሉ በእንግሊዝኛ ርዕሶች ነው (ለExcel/Google Sheets)፤ ስሞቹ እንዳሉ (አማርኛም) ይወጣሉ።
 */
export async function GET(request: Request) {
  const viewer = await getTelegramViewer();
  if (!viewer || !canUseSchool(viewer, "marketing")) return new Response(null, { status: 404 });
  const requested = new URL(request.url).searchParams.get("segment") ?? "all";
  const segment = isSegment(requested) ? requested : "all";
  const t = createT("en");
  const [students, staff] = await Promise.all([getStudents(), listStaffNames()]);
  const names = new Map(staff.map((member) => [member.id, member.name]));
  const rows = students
    .filter((student) => inSegment(segment, student.stage, student.followUp))
    .map((student) =>
      [
        student.name,
        student.username ? `@${student.username}` : "",
        student.phones.join(" "),
        t(segmentLabels[student.stage]),
        student.followUp ? t("Yes") : "",
        addisDayKey(student.lastMessageAt),
        addisDayKey(student.createdAt),
        student.ownerStaffId ? (names.get(student.ownerStaffId) ?? "") : "",
        student.username ? `https://t.me/${student.username}` : "",
      ]
        .map(cell)
        .join(",")
    );
  const header = [t("Student"), t("Username"), t("Phone numbers"), t("Stage"), t("Follow up"), t("Last message"), t("First message"), t("Staff"), t("Telegram")]
    .map(cell)
    .join(",");
  // BOM፦ Excel አማርኛውን በትክክል እንዲያሳይ።
  const body = `﻿${[header, ...rows].join("\r\n")}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="school-students-${segment}-${addisDayKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
