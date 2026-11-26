import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminShell, SIDEBAR_COOKIE } from "@/components/admin-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";
import { getT } from "@/lib/i18n-server";
import { getCurrentUser, requireAdmin } from "@/lib/session";
import { getTelegramViewer } from "@/lib/telegram/access";
import { staffPages } from "@/lib/telegram/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t("Admin"), template: `%s | ${t("Admin")}` }, robots: { index: false } };
}

/**
 * አድሚኑ ሁሉንም ያያል፤ ሰራተኞች አድሚኑ የፈቀደላቸውን ገጾች ብቻ። ሌላ ሰው 404 (ገጾቹ ራሳቸውም ይፈትሻሉ)።
 * ምናሌው ጠብቦ እንደተተወ cookie-ው ይነግረናል፤ ገጹ ሲከፈት ሳይዘል በዚያው መጠን ይታያል።
 */
async function Shell({ children }: { children: React.ReactNode }) {
  const viewer = await getTelegramViewer();
  if (!viewer) await requireAdmin();
  const user = await getCurrentUser();
  const compact = (await cookies()).get(SIDEBAR_COOKIE)?.value === "compact";
  const isStaff = Boolean(viewer && !viewer.isAdmin);
  const name = viewer?.name ?? user?.name ?? "";
  return (
    <AdminShell
      initialCompact={compact}
      only={viewer && !viewer.isAdmin ? staffPages(viewer.can) : undefined}
      user={{ name, email: user?.email ?? "", image: user?.image ?? null }}
      actions={
        <>
          <Suspense fallback={<Skeleton className="h-8 w-20 rounded-full" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          {user ? <UserMenu name={name} image={user.image} isAdmin={user.isAdmin} isStaff={isStaff} /> : null}
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>{children}</Suspense>
    </AdminShell>
  );
}

/** ጨለማ ገጽታው እንደ ምሳሌው ምስል ጥቁር ሰማያዊ ነው (በአድሚን ገጾች ብቻ)፤ ወርቃማው አክሰንት አይቀየርም። */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col dark:[--accent:#1A263D] dark:[--background:#0E1729] dark:[--border:#22304A] dark:[--card:#131E33] dark:[--input:#22304A] dark:[--muted-foreground:#8C99B3] dark:[--muted:#1A263D] dark:[--popover:#16223A] dark:[--secondary:#1A263D] dark:[--sidebar-border:#22304A] dark:[--sidebar:#0B1424]">
      <Suspense
        fallback={
          <div className="flex min-h-dvh flex-1">
            <Skeleton className="hidden h-dvh w-64 rounded-none lg:block" />
            <Skeleton className="m-6 h-96 flex-1 rounded-xl" />
          </div>
        }
      >
        <Shell>{children}</Shell>
      </Suspense>
    </div>
  );
}
