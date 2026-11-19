import "server-only";
import type { Prisma, WalletEntryType } from "@/lib/generated/prisma/client";
import { DomainError } from "@/lib/marketplace-errors";

/**
 * የዋሌት ሂሳብ የሚቀየረው በእነዚህ ሁለት ተግባራት ብቻ ነው፣ ሁልጊዜም በtransaction ውስጥ።
 * እያንዳንዱ ለውጥ WalletEntry ይመዘግባል፤ ቀሪ ሂሳቡ ከዜሮ በታች አይወርድም (ዳታቤዙም CHECK አለው)።
 */

type Tx = Prisma.TransactionClient;
type Refs = { orderId?: string; depositId?: string; withdrawalId?: string; jobId?: string };

export { FEE_PERCENT, feeFor } from "@/lib/fees";

export const MIN_DEPOSIT_ETB = 50;
export const MIN_WITHDRAWAL_ETB = 100;

export async function credit(tx: Tx, userId: string, amountEtb: number, type: WalletEntryType, refs: Refs = {}) {
  if (!Number.isInteger(amountEtb) || amountEtb <= 0) throw new Error(`wallet credit: bad amount ${amountEtb}`);
  const user = await tx.user.update({
    where: { id: userId },
    data: { walletBalanceEtb: { increment: amountEtb } },
    select: { walletBalanceEtb: true },
  });
  await tx.walletEntry.create({ data: { userId, type, amountEtb, balanceAfter: user.walletBalanceEtb, ...refs } });
}

export async function debit(tx: Tx, userId: string, amountEtb: number, type: WalletEntryType, refs: Refs = {}) {
  if (!Number.isInteger(amountEtb) || amountEtb <= 0) throw new Error(`wallet debit: bad amount ${amountEtb}`);
  // ሁኔታው በራሱ ዝመናው ውስጥ ስለሆነ በአንድ ጊዜ የሚመጡ ሁለት ክፍያዎች ሂሳቡን ከዜሮ በታች ሊያወርዱት አይችሉም።
  const { count } = await tx.user.updateMany({
    where: { id: userId, walletBalanceEtb: { gte: amountEtb } },
    data: { walletBalanceEtb: { decrement: amountEtb } },
  });
  if (count !== 1) throw new DomainError("There isn't enough money in your wallet.");
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletBalanceEtb: true } });
  await tx.walletEntry.create({ data: { userId, type, amountEtb: -amountEtb, balanceAfter: user.walletBalanceEtb, ...refs } });
}

export type DepositAccount = { method: string; number: string; holder: string };

/** ተጠቃሚዎች ብር የሚልኩባቸው የድርጅቱ ሂሳቦች፦ WALLET_DEPOSIT_ACCOUNTS="telebirr|0911000000|Ethio CS;cbe|1000…|Ethio CS" */
export function depositAccounts(): DepositAccount[] {
  return (process.env.WALLET_DEPOSIT_ACCOUNTS ?? "")
    .split(";")
    .map((item) => item.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length === 3 && parts.every(Boolean))
    .map(([method, number, holder]) => ({ method, number, holder }));
}
