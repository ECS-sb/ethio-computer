import { ArrowLeftIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { GigForm } from "@/components/talent/gig-form";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("New service");

export default async function NewGigPage() {
  const t = await getT();
  await requireUser("/dashboard/talent/new");
  return (
    <>
      <LocaleLink href="/dashboard/talent" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("My services")}
      </LocaleLink>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{t("New service")}</h1>
        <p className="text-muted-foreground">{t("Tell clients what you do and show your best work. An admin reviews it before it goes live.")}</p>
      </div>
      <GigForm />
    </>
  );
}
