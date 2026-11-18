import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffSignIn } from "@/components/staff-sign-in";
import { Skeleton } from "@/components/ui/skeleton";
import { localePath } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/session";
import { getTelegramViewer } from "@/lib/telegram/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Staff sign-in"), robots: { index: false } };
}

/** አድሚን ወይም ሰራተኛ አስቀድሞ ከገባ በቀጥታ ወደ ስራ ገጹ ይሄዳል (/admin ማን እንደሆነ አይቶ ያስተላልፋል)። */
async function StaffSignInContent() {
  const t = await getT();
  const user = await getCurrentUser();
  if (user && (await getTelegramViewer())) redirect(localePath(await getLocale(), "/admin"));

  return (
    <div className="flex flex-col gap-6">
      {user ? (
        <p role="alert" className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          {t("You're signed in as {email}, which isn't a staff account. Sign in with the email and password your admin gave you.", { email: user.email })}
        </p>
      ) : null}
      <StaffSignIn />
    </div>
  );
}

export default async function StaffSignInPage() {
  const t = await getT();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("Staff sign-in")}</h1>
        <p className="text-sm text-muted-foreground">{t("For Ethio Computer staff. Use the email and password your admin gave you.")}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-56 rounded-xl" />}>
        <StaffSignInContent />
      </Suspense>
    </div>
  );
}
