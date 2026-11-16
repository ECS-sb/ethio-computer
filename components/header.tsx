import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { LocaleLink } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";
import { getT } from "@/lib/i18n-server";
import { getCurrentUser } from "@/lib/session";
import { getTelegramViewer } from "@/lib/telegram/access";

async function HeaderAuth() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user || user.suspended) {
    return (
      <LocaleLink href="/login" className={buttonVariants({ className: "rounded-full px-4 sm:px-6" })}>
        {t("Sign in")}
      </LocaleLink>
    );
  }
  // ቻት የሚመልሱ ሰራተኞች በምናሌው በኩል ወደ ቴሌግራም ቻቶቹ ይሄዳሉ።
  const teamInbox = !user.isAdmin && Boolean((await getTelegramViewer())?.can.chats);
  return <UserMenu name={user.name} image={user.image} isAdmin={user.isAdmin} teamInbox={teamInbox} />;
}

export function Header() {
  return (
    <SiteHeader
      brand={<Brand className="shrink-0" />}
      languageSlot={
        <Suspense fallback={<Skeleton className="h-8 w-20 rounded-full" />}>
          <LanguageSwitcher />
        </Suspense>
      }
      authSlot={
        <Suspense fallback={<Skeleton className="size-10 rounded-full" />}>
          <HeaderAuth />
        </Suspense>
      }
    />
  );
}
