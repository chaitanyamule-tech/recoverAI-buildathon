-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN     "attemptType" TEXT NOT NULL DEFAULT 'INITIAL';

-- CreateIndex
CREATE INDEX "PaymentAttempt_transactionId_attemptType_idx" ON "PaymentAttempt"("transactionId", "attemptType");
