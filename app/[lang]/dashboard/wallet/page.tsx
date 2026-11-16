import { ArrowDownLeftIcon, ArrowUpRightIcon, BadgeCheckIcon, WalletIcon } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { LocaleLink } from "@/components/i18n-provider";
import { ImageUploadField } from "@/components/image-upload-field";
import { SelectInput } from "@/components/select-input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDepositAction, requestWithdrawalAction } from "@/lib/actions";
import { banks, depositMethods, formatDateTime, formatPrice, labelOf, reviewStatusLabels, walletEntryLabels, withdrawalStatusLabels } from "@/lib/catalog";
import { getT, pageTitle } from "@/lib/i18n-server";
import { getWallet } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { depositAccounts, MIN_DEPOSIT_ETB, MIN_WITHDRAWAL_ETB } from "@/lib/wallet";

export const generateMetadata = pageTitle("Wallet");

const card = "flex flex-col gap-6 rounded-xl bg-card/70 p-6 ring-1 ring-foreground/10";

export default async function WalletPage() {
  const t = await getT();
  const user = await requireUser("/dashboard/wallet");
  const wallet = await getWallet(user.id);
  const accounts = depositAccounts();
  const canWithdraw = wallet.verifiedSeller && wallet.verification?.status === "APPROVED";
  const pendingDeposits = wallet.deposits.filter((deposit) => deposit.status === "PENDING");

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("Wallet")}</h1>

      <section className="relative flex flex-col gap-2 overflow-hidden rounded-xl bg-linear-to-br from-primary to-gold-2 p-6 text-primary-foreground sm:p-8">
        <p className="flex items-center gap-2 text-sm font-medium">
          <WalletIcon className="size-4" />
          {t("Available balance")}
        </p>
        <p className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{formatPrice(t, wallet.balanceEtb)}</p>
        <p className="text-sm">{t("You pay for accounts from this balance. Money from your sales arrives here after the fee.")}</p>
        {pendingDeposits.length > 0 ? (
          <p className="text-sm font-semibold">
            {t("Waiting for review: {amount}", { amount: formatPrice(t, pendingDeposits.reduce((sum, deposit) => sum + deposit.amountEtb, 0)) })}
          </p>
        ) : null}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={card}>
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <ArrowDownLeftIcon className="size-5 text-primary" />
              {t("Add money")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("1. Send the money to one of these accounts. 2. Enter the transaction number and upload the receipt. 3. It shows in your wallet after an admin checks it.")}</p>
          </div>
          {accounts.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {accounts.map((account) => (
                <li key={`${account.method}-${account.number}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 p-4 text-sm">
                  <span className="font-semibold">{t(labelOf(depositMethods, account.method))}</span>
                  <span className="font-mono" dir="ltr">
                    {account.number}
                  </span>
                  <span className="w-full text-xs text-muted-foreground">{account.holder}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-primary/15 p-4 text-sm ring-1 ring-primary/30">{t("Payment accounts aren't set up yet. Contact us before sending money.")}</p>
          )}
          <ActionForm action={createDepositAction} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="deposit-amount">{t("Amount (ETB)")}</Label>
                <Input id="deposit-amount" name="amountEtb" type="number" min={MIN_DEPOSIT_ETB} step={1} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="deposit-method">{t("Sent with")}</Label>
                <SelectInput id="deposit-method" name="method" options={depositMethods} defaultValue="telebirr" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-reference">{t("Transaction number")}</Label>
              <Input id="deposit-reference" name="reference" required minLength={4} maxLength={60} autoComplete="off" dir="ltr" />
            </div>
            <ImageUploadField name="receipt" label={t("Upload the receipt")} />
            <SubmitButton className="w-fit">{t("Send for review")}</SubmitButton>
          </ActionForm>
        </section>

        <section className={card}>
          <div className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <ArrowUpRightIcon className="size-5 text-primary" />
              {t("Withdraw")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("Money is sent only to the bank account in your verified name.")}</p>
          </div>
          {canWithdraw && wallet.verification ? (
            <ActionForm action={requestWithdrawalAction} className="flex flex-col gap-4">
              <p className="flex items-center gap-2 rounded-xl bg-secondary/60 p-4 text-sm">
                <BadgeCheckIcon className="size-4 shrink-0 text-primary" />
                {t(labelOf(banks, wallet.verification.bankName))} · <span dir="ltr">{wallet.verification.bankAccountNumber}</span> · {wallet.verification.bankAccountName}
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="withdraw-amount">{t("Amount (ETB)")}</Label>
                <Input id="withdraw-amount" name="amountEtb" type="number" min={MIN_WITHDRAWAL_ETB} max={wallet.balanceEtb} step={1} required />
              </div>
              <SubmitButton className="w-fit" disabled={wallet.balanceEtb < MIN_WITHDRAWAL_ETB}>
                {t("Request withdrawal")}
              </SubmitButton>
            </ActionForm>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-xl bg-primary/10 p-4 text-sm ring-1 ring-primary/30">
              <p>{t("Verify your account to withdraw. Verified sellers also get a badge and sell faster.")}</p>
              <LocaleLink href="/dashboard/verification" className={buttonVariants({ size: "sm" })}>
                {t("Verify my account")}
              </LocaleLink>
            </div>
          )}
        </section>
      </div>

      <section className={card}>
        <h2 className="text-xl font-semibold">{t("History")}</h2>
        {wallet.entries.length === 0 && wallet.deposits.length === 0 && wallet.withdrawals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Nothing yet.")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {wallet.deposits
              .filter((deposit) => deposit.status !== "APPROVED")
              .map((deposit) => (
                <li key={deposit.id} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t("Deposit")} · {t(labelOf(depositMethods, deposit.method))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(deposit.createdAt)} · <span dir="ltr">{deposit.reference}</span>
                      {deposit.rejectReason ? ` · ${deposit.rejectReason}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={deposit.status === "REJECTED" ? "destructive" : "secondary"}>{t(reviewStatusLabels[deposit.status])}</Badge>
                    <span className="font-semibold text-muted-foreground">{formatPrice(t, deposit.amountEtb)}</span>
                  </div>
                </li>
              ))}
            {wallet.withdrawals
              .filter((withdrawal) => withdrawal.status === "PENDING")
              .map((withdrawal) => (
                <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{t("Withdrawal")}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(withdrawal.createdAt)}</span>
                  </div>
                  <Badge variant="secondary">{t(withdrawalStatusLabels[withdrawal.status])}</Badge>
                </li>
              ))}
            {wallet.entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{t(walletEntryLabels[entry.type])}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)} · {t("Balance: {amount}", { amount: formatPrice(t, entry.balanceAfter) })}
                  </span>
                </div>
                <span className={cn("font-semibold", entry.amountEtb > 0 ? "text-primary" : "text-foreground")}>
                  {entry.amountEtb > 0 ? "+" : "−"}
                  {formatPrice(t, Math.abs(entry.amountEtb))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
