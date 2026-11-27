import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { SelectInput } from "@/components/select-input";
import { ServiceLogo } from "@/components/subscriptions/service-logo";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatPrice } from "@/lib/catalog";
import { chapaEnabled } from "@/lib/chapa";
import { getT, pageTitle } from "@/lib/i18n-server";
import { isMessageKey } from "@/lib/talent-catalog";
import {
  addPlanAction,
  addPopularServicesAction,
  createServiceAction,
  deliverSubscriptionAction,
  refundSubscriptionAction,
  savePriceSettingsAction,
  setServiceActiveAction,
  updatePlanAction,
} from "@/lib/subscription-actions";
import { planPriceEtb, subscriptionCategories, subscriptionCategory, subscriptionInfoOptions, subscriptionStatusLabels } from "@/lib/subscription-catalog";
import { getSubscriptionCatalogForAdmin, getSubscriptionQueue, getSubscriptionStats } from "@/lib/subscription-queries";
import { getPriceSettings } from "@/lib/subscriptions";
import { requireStaff } from "@/lib/telegram/access";

export const generateMetadata = pageTitle("Subscriptions");

const card = "flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10";

export default async function AdminSubscriptionsPage() {
  const t = await getT();
  const viewer = await requireStaff("/admin/subscriptions", "ordersDecide");
  const [queue, stats, settings, catalog] = await Promise.all([
    getSubscriptionQueue(),
    getSubscriptionStats(),
    getPriceSettings(),
    viewer.isAdmin ? getSubscriptionCatalogForAdmin() : [],
  ]);
  const waiting = queue.filter((order) => order.status === "PAID");
  const done = queue.filter((order) => order.status !== "PAID").slice(0, 20);

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Subscriptions")}</h1>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[
          { label: t("Waiting to activate"), value: String(stats.waiting) },
          { label: t("Paid orders"), value: String(stats.orders) },
          { label: t("Money received"), value: formatPrice(t, stats.revenueEtb) },
          { label: t("Chapa"), value: chapaEnabled() ? t("On") : t("Off") },
        ].map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10">
            <span className="text-2xl font-semibold text-primary">{tile.value}</span>
            <span className="text-sm text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Orders to activate")}</h2>
        {waiting.length === 0 ? (
          <p className="rounded-xl bg-card/70 p-6 text-center text-muted-foreground ring-1 ring-foreground/10">{t("No orders waiting.")}</p>
        ) : (
          waiting.map((order) => (
            <article key={order.id} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {order.serviceName} · {isMessageKey(order.planLabel) ? t(order.planLabel) : order.planLabel}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(t, order.amountEtb)} · {order.payMethod === "CHAPA" ? "Chapa" : t("Wallet")} · {order.paidAt ? formatDateTime(order.paidAt) : ""}
                </span>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("Customer")}</dt>
                  <dd className="break-all">
                    {order.user.name} ({order.user.email}){order.user.phone ? ` · ${order.user.phone}` : ""}
                  </dd>
                </div>
                {order.accountInfo ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Account to activate")}</dt>
                    <dd dir="ltr" className="font-mono break-all">
                      {order.accountInfo}
                    </dd>
                  </div>
                ) : null}
                {order.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">{t("Customer's note")}</dt>
                    <dd className="break-words whitespace-pre-line">{order.note}</dd>
                  </div>
                ) : null}
              </dl>
              <ActionForm action={deliverSubscriptionAction} className="flex flex-col gap-2 border-t border-border pt-4">
                <input type="hidden" name="id" value={order.id} />
                <Label htmlFor={`deliver-${order.id}`}>{t("Message to the customer")}</Label>
                <Textarea
                  id={`deliver-${order.id}`}
                  name="note"
                  required
                  minLength={2}
                  maxLength={2000}
                  rows={2}
                  placeholder={t("For example: Activated on your account until 27 Dec. Or the code / login details.")}
                />
                <SubmitButton className="w-fit">{t("Mark as activated")}</SubmitButton>
              </ActionForm>
              <ActionForm action={refundSubscriptionAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={order.id} />
                <Input name="note" maxLength={500} placeholder={t("Reason (shown to the customer)")} aria-label={t("Reason (shown to the customer)")} className="h-9 max-w-xs" />
                <SubmitButton variant="outline" size="sm">
                  {t("Refund to wallet")}
                </SubmitButton>
              </ActionForm>
            </article>
          ))
        )}
      </section>

      {done.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{t("Recent orders")}</h2>
          <ul className="flex flex-col gap-2">
            {done.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card/70 px-4 py-3 text-sm ring-1 ring-foreground/10">
                <span>
                  {order.serviceName} · {isMessageKey(order.planLabel) ? t(order.planLabel) : order.planLabel} · <span className="text-muted-foreground">{order.user.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={order.status === "DELIVERED" ? "default" : "outline"}>{t(subscriptionStatusLabels[order.status])}</Badge>
                  <span className="font-semibold text-primary">{formatPrice(t, order.amountEtb)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewer.isAdmin ? (
        <>
          <section className={card}>
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{t("Prices")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("Plans are priced in dollars. The price in birr = dollars × your rate × (1 + profit %) + profit in birr. A plan with its own birr price ignores this. Nothing is sold until the rate is set.")}
              </p>
            </div>
            <ActionForm action={savePriceSettingsAction} className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="usd-rate">{t("Birr per 1 US dollar")}</Label>
                <Input id="usd-rate" name="usdRate" type="number" step="0.01" min={1} required defaultValue={settings.usdRate || ""} className="w-40" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="markup">{t("Profit (%)")}</Label>
                <Input id="markup" name="markupPercent" type="number" step="0.1" min={0} required defaultValue={settings.markupPercent} className="w-32" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="markup-etb">{t("Profit per plan (birr)")}</Label>
                <Input id="markup-etb" name="markupEtb" type="number" step="1" min={0} required defaultValue={settings.markupEtb} className="w-36" />
              </div>
              <SubmitButton>{t("Save")}</SubmitButton>
            </ActionForm>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{t("Catalog")}</h2>
              <ActionForm action={addPopularServicesAction}>
                <SubmitButton variant="outline">{t("Add the popular subscriptions")}</SubmitButton>
              </ActionForm>
            </div>
            <p className="text-sm text-muted-foreground">{t("The dollar prices of the popular subscriptions are starting points. Check each one before selling, because prices change.")}</p>
            {catalog.map((service) => (
              <article key={service.id} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ServiceLogo name={service.name} className="size-9" />
                    <h3 className="font-semibold">{service.name}</h3>
                    <Badge variant="outline">{t(subscriptionCategory(service.category)?.label ?? "Others")}</Badge>
                    {!service.active ? <Badge variant="secondary">{t("Hidden")}</Badge> : null}
                  </div>
                  <ActionButton action={setServiceActiveAction} id={service.id} fields={{ active: service.active ? "false" : "true" }} variant="ghost" size="sm">
                    {service.active ? t("Hide") : t("Show")}
                  </ActionButton>
                </div>
                <ul className="flex flex-col gap-2">
                  {service.plans.map((plan) => {
                    const price = planPriceEtb(plan, settings);
                    return (
                      <li key={plan.id}>
                        <ActionForm action={updatePlanAction} className="flex flex-wrap items-center gap-2 text-sm">
                          <input type="hidden" name="id" value={plan.id} />
                          <span className="w-36 font-medium">{isMessageKey(plan.label) ? t(plan.label) : plan.label}</span>
                          <Input name="usd" type="number" step="0.01" min={0} defaultValue={(plan.usdCents / 100).toFixed(2)} aria-label={t("Price in dollars")} className="h-8 w-24" />
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input name="priceEtb" type="number" min={1} defaultValue={plan.priceEtb ?? ""} placeholder={t("Birr price")} aria-label={t("Fixed price in birr")} className="h-8 w-28" />
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="active" value="on" defaultChecked={plan.active} className="accent-primary" />
                            {t("For sale")}
                          </label>
                          <span className="w-28 font-semibold text-primary">{price ? formatPrice(t, price) : "—"}</span>
                          <SubmitButton variant="outline" size="sm">
                            {t("Save")}
                          </SubmitButton>
                        </ActionForm>
                      </li>
                    );
                  })}
                </ul>
                <ActionForm action={addPlanAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
                  <input type="hidden" name="id" value={service.id} />
                  <Input name="label" required maxLength={40} placeholder={t("New plan, e.g. 3 months")} aria-label={t("Plan name")} className="h-8 w-44" />
                  <Input name="usd" type="number" step="0.01" min={0} placeholder="$" aria-label={t("Price in dollars")} className="h-8 w-24" />
                  <Input name="priceEtb" type="number" min={1} placeholder={t("Birr price")} aria-label={t("Fixed price in birr")} className="h-8 w-28" />
                  <SubmitButton variant="ghost" size="sm">
                    {t("Add plan")}
                  </SubmitButton>
                </ActionForm>
              </article>
            ))}

            <ActionForm action={createServiceAction} className={card}>
              <h3 className="font-semibold">{t("Add a subscription")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="service-name">{t("Name")}</Label>
                  <Input id="service-name" name="name" required minLength={2} maxLength={60} placeholder="Starlink, Shahid VIP…" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="service-category">{t("Category")}</Label>
                  <SelectInput id="service-category" name="category" options={subscriptionCategories} defaultValue="OTHER" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="service-info">{t("What we need from the customer")}</Label>
                  <SelectInput id="service-info" name="requiredInfo" options={subscriptionInfoOptions} defaultValue="EMAIL" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="service-description">{t("Short description")}</Label>
                  <Input id="service-description" name="description" maxLength={300} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="service-plan">{t("First plan")}</Label>
                  <Input id="service-plan" name="label" required maxLength={40} defaultValue="1 month" />
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="service-usd">{t("Price in dollars")}</Label>
                    <Input id="service-usd" name="usd" type="number" step="0.01" min={0} defaultValue={0} />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="service-etb">{t("or birr")}</Label>
                    <Input id="service-etb" name="priceEtb" type="number" min={1} />
                  </div>
                </div>
              </div>
              <SubmitButton className="w-fit">{t("Add")}</SubmitButton>
            </ActionForm>
          </section>
        </>
      ) : null}
    </>
  );
}
