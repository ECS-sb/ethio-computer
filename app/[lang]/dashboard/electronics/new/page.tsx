import { ArrowLeftIcon } from "lucide-react";
import { ProductForm } from "@/components/electronics/product-form";
import { LocaleLink } from "@/components/i18n-provider";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireUser } from "@/lib/session";

export const generateMetadata = pageTitle("Sell an item");

export default async function NewProductPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/electronics/new");
  return (
    <>
      <LocaleLink href="/dashboard/electronics" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("My items")}
      </LocaleLink>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{user.isAdmin ? t("New Ethio Computer item") : t("Sell an item")}</h1>
        <p className="text-muted-foreground">
          {user.isAdmin
            ? t("It goes live right away under the name Ethio Computer with an Official badge, above the other sellers. Nothing is deducted.")
            : t("Describe the item honestly and add real photos. An admin checks it before it goes live.")}
        </p>
      </div>
      <ProductForm official={user.isAdmin} />
    </>
  );
}
