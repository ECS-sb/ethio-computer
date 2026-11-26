import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { ChatLog } from "@/components/talent/chat-log";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/catalog";
import { productOrderLabels } from "@/lib/electronics-catalog";
import { getDealForAdmin } from "@/lib/electronics-queries";
import { getT, pageTitle } from "@/lib/i18n-server";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Electronics");

/** አለመግባባት ሲኖር አድሚኑ ሙሉ ቻቱንና የትዕዛዙን ሁኔታ ያያል። */
export default async function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  await requireStaff(`/admin/electronics/${id}`, "ordersDecide");
  const deal = await getDealForAdmin(id);
  if (!deal) notFound();
  const names = {
    [deal.buyerId]: t("Buyer: {name}", { name: deal.buyer.name }),
    [deal.product.sellerId]: t("Seller: {name}", { name: deal.product.seller.name }),
  };

  return (
    <>
      <LocaleLink href="/admin/electronics" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        {t("Electronics")}
      </LocaleLink>
      <h1 className="text-2xl font-semibold text-balance">
        <LocaleLink href={`/electronics/${deal.product.id}`} className="hover:underline">
          {deal.product.title}
        </LocaleLink>
      </h1>
      <div className="flex flex-wrap gap-2">
        {deal.orders.map((order) => (
          <span key={order.id} className="flex items-center gap-2 rounded-xl bg-card/70 px-4 py-2 ring-1 ring-foreground/10">
            <Badge variant={order.status === "DISPUTED" ? "destructive" : "secondary"}>{t(productOrderLabels[order.status])}</Badge>
            <span className="text-sm font-semibold text-primary">{formatPrice(t, order.amountEtb)}</span>
          </span>
        ))}
      </div>
      <section aria-label={t("Chat")} className="flex flex-col gap-2 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
        <ChatLog messages={deal.messages} selfId={deal.product.sellerId} names={names} />
      </section>
    </>
  );
}
