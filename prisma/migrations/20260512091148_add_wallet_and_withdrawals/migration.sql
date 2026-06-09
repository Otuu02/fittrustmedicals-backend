/*
  Warnings:

  - You are about to drop the column `priceCents` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `totalCents` on the `orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transactionReference]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "priceCents";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "totalCents",
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedBy" TEXT,
ADD COLUMN     "transactionReference" TEXT;

-- CreateTable
CREATE TABLE "wallets" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT 'Access Bank',
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "reference" TEXT,
    "processedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transfer_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "senderAccountName" TEXT NOT NULL,
    "senderAccountNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transfer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_reference_key" ON "withdrawals"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_payments_orderId_key" ON "bank_transfer_payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_payments_transactionRef_key" ON "bank_transfer_payments"("transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "orders_transactionReference_key" ON "orders"("transactionReference");
