import Image from "next/image";
import { ReviewForm } from "@/components/review-form";
import { banks, depositMethods, formatDateTime, formatPrice, labelOf } from "@/lib/catalog";
import { reviewDepositAction, reviewWithdrawalAction } from "@/lib/actions";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getPendingDeposits, getPendingWithdrawals } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";

export const generateMetadata = pageTitle("Deposits & withdrawals");

const card = "flex flex-col gap-4 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10";
const empty = "rounded-xl bg-card/70 p-12 text-center text-muted-foreground ring-1 ring-foreground/10";

export default async function AdminWalletPage() {
  const t = await getT();
  await requireAdmin();
  const [deposits, withdrawals] = await Promise.all([getPendingDeposits(), getPendingWithdrawals()]);

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Deposits & withdrawals")}</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("Deposits to check ({count})", { count: deposits.length })}</h2>
        <p className="text-sm text-muted-foreground">{t("Check that the money reached our account with this transaction number before approving.")}</p>
        {deposits.length === 0 ? (
          <p className={empty}>{t("Nothing to review.")}</p>
        ) : (
          deposits.map((deposit) => (
            <article key={deposit.id} className={card}>
              <div className="flex flex-wrap items-start gap-6">
                <a href={`/api/admin-files/deposit/${deposit.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                  <Image
                    unoptimized
                    src={`/api/admin-files/deposit/${deposit.id}`}
                    alt={t("Receipt")}
                    width={160}
                    height={220}
                    className="h-56 w-40 rounded-xl bg-secondary object-cover object-top ring-1 ring-foreground/10 hover:ring-primary/60"
                  />
                </a>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-2xl font-semibold text-primary">{formatPrice(t, deposit.amountEtb)}</p>
                  <p className="text-sm">
                    {t(labelOf(depositMethods, deposit.method))} · <span className="font-mono" dir="ltr">{deposit.reference}</span>
                  </p>
                  <p className="text-sm text-muted-foreground break-all">
                    {deposit.user.name} ({deposit.user.email})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(deposit.createdAt)} · {t("Current balance: {amount}", { amount: formatPrice(t, deposit.user.walletBalanceEtb) })}
                  </p>
                </div>
              </div>
              <ReviewForm action={reviewDepositAction} id={deposit.id} approveLabel={t("Money received, add to wallet")} />
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-4 pt-6">
        <h2 className="text-xl font-semibold">{t("Withdrawals to pay ({count})", { count: withdrawals.length })}</h2>
        <p className="text-sm text-muted-foreground">{t("The money is already taken from the wallet. Send it to this bank account, then mark it as paid. Rejecting returns it to the wallet.")}</p>
        {withdrawals.length === 0 ? (
          <p className={empty}>{t("Nothing to review.")}</p>
        ) : (
          withdrawals.map((withdrawal) => (
            <article key={withdrawal.id} className={card}>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-semibold text-primary">{formatPrice(t, withdrawal.amountEtb)}</p>
                <p className="text-sm">
                  {t(labelOf(banks, withdrawal.bankName))} · <span className="font-mono" dir="ltr">{withdrawal.bankAccountNumber}</span> · {withdrawal.bankAccountName}
                </p>
                <p className="text-sm text-muted-foreground break-all">
                  {withdrawal.user.name} ({withdrawal.user.email}) {withdrawal.user.phone ? <span dir="ltr">· {withdrawal.user.phone}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(withdrawal.createdAt)}</p>
              </div>
              <ReviewForm action={reviewWithdrawalAction} id={withdrawal.id} approveLabel={t("Mark as paid")} />
            </article>
          ))
        )}
      </section>
    </>
  );
}
