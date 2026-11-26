import {
  BadgeDollarSignIcon,
  BanknoteIcon,
  HistoryIcon,
  LifeBuoyIcon,
  MessageCircleMoreIcon,
  RocketIcon,
  ShieldCheckIcon,
  SquarePlusIcon,
  type LucideIcon,
} from "lucide-react";
import { PageIntro } from "@/components/brand";
import { PageActions } from "@/components/page-actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { contact, faqs, services, type ServiceId } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";

export const generateMetadata = pageTitle("Services");

const icons: Record<ServiceId, LucideIcon> = {
  boost: RocketIcon,
  history: HistoryIcon,
  adsense: ShieldCheckIcon,
  newChannel: SquarePlusIcon,
  monetization: BadgeDollarSignIcon,
  withdrawal: BanknoteIcon,
  recovery: LifeBuoyIcon,
  other: MessageCircleMoreIcon,
};

/** ከአካውንት ሽያጭ ውጪ ያሉ አገልግሎቶች (ቡስት፣ የዩቲዩብ ሂስትሪ፣ AdSense/2-Step፣ ቻናል መክፈት…)፤ ከስሩ የቆዩት ጥያቄዎች (FAQ)። */
export default async function ServicesPage() {
  const t = await getT();
  return (
    <>
      <PageIntro
        eyebrow={t("Services")}
        title={
          <>
            {t("What we")} <span className="text-gold">{t("can do for you")}</span>
          </>
        }
        description={t("Besides buying and selling accounts, we help you grow, fix and get paid from your channels. Message us on Telegram to order.")}
      />
      <PageActions
        primary={{ label: t("Order on Telegram"), href: contact.telegramUserUrl, external: true }}
        secondary={{ label: t("Call {phone}", { phone: contact.phone }), href: contact.phoneUrl }}
        guide="services"
      />
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => {
          const Icon = icons[service.id];
          return (
            <li key={service.id} className="flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="text-lg font-semibold">{t(service.title)}</h2>
              <p className="flex-1 text-sm text-muted-foreground">{t(service.description)}</p>
              <a href={contact.telegramUserUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                {t("Order on Telegram")}
              </a>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-6 pt-12">
        <h2 className="text-3xl font-semibold">
          {t("Frequently asked")} <span className="text-gold">{t("questions")}</span>
        </h2>
        <div className="max-w-3xl rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
          <Accordion>
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{t(faq.question)}</AccordionTrigger>
                <AccordionContent>{t(faq.answer)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
