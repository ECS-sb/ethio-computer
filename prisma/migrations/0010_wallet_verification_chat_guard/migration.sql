-- CreateEnum
CREATE TYPE "HandoverMode" AS ENUM ('SELF', 'AGENT');

-- CreateEnum
CREATE TYPE "IdDocumentType" AS ENUM ('FAYDA', 'PASSPORT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('DEPOSIT', 'PURCHASE', 'REFUND', 'SALE', 'WITHDRAWAL', 'WITHDRAWAL_RETURNED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "chatStrikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walletBalanceEtb" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "handover" "HandoverMode" NOT NULL DEFAULT 'SELF';

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "feeEtb" INTEGER,
ADD COLUMN     "feePercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "handover" "HandoverMode" NOT NULL DEFAULT 'SELF',
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payoutEtb" INTEGER;

-- CreateTable
CREATE TABLE "seller_verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idType" "IdDocumentType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "idImage" BYTEA NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "receipt" BYTEA,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletEntryType" NOT NULL,
    "amountEtb" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "depositId" TEXT,
    "withdrawalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_violation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "body" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_violation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_verification_userId_key" ON "seller_verification"("userId");

-- CreateIndex
CREATE INDEX "seller_verification_status_createdAt_idx" ON "seller_verification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "deposit_status_createdAt_idx" ON "deposit"("status", "createdAt");

-- CreateIndex
CREATE INDEX "deposit_userId_idx" ON "deposit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_method_reference_key" ON "deposit"("method", "reference");

-- CreateIndex
CREATE INDEX "withdrawal_status_createdAt_idx" ON "withdrawal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "withdrawal_userId_idx" ON "withdrawal"("userId");

-- CreateIndex
CREATE INDEX "wallet_entry_userId_createdAt_idx" ON "wallet_entry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_violation_createdAt_idx" ON "chat_violation"("createdAt");

-- CreateIndex
CREATE INDEX "chat_violation_userId_idx" ON "chat_violation"("userId");

-- AddForeignKey
ALTER TABLE "seller_verification" ADD CONSTRAINT "seller_verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit" ADD CONSTRAINT "deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entry" ADD CONSTRAINT "wallet_entry_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "withdrawal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_violation" ADD CONSTRAINT "chat_violation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- የዋሌት ሂሳብ ከዜሮ በታች መውረድ አይችልም (ከኮዱ ጥበቃ በተጨማሪ)።
ALTER TABLE "user" ADD CONSTRAINT "user_wallet_balance_non_negative" CHECK ("walletBalanceEtb" >= 0);
