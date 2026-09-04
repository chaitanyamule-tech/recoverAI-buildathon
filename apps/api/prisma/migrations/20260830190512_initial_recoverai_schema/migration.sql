/*
  Warnings:

  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CARD', 'NETBANKING', 'WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "RecoveryCaseStatus" AS ENUM ('DETECTED', 'ANALYZING', 'DIAGNOSED', 'PLANNED', 'PENDING_POLICY', 'APPROVED', 'EXECUTING', 'RECOVERED', 'ESCALATED', 'STOPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "RecoveryActionType" AS ENUM ('RETRY_PAYMENT', 'SEND_REMINDER', 'OFFER_ALTERNATIVE_METHOD', 'WAIT', 'ESCALATE', 'STOP');

-- CreateEnum
CREATE TYPE "RecoveryActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('AI', 'SYSTEM', 'HUMAN', 'MERCHANT');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- DropTable
DROP TABLE "Test";

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "totalPayments" INTEGER NOT NULL DEFAULT 0,
    "successfulPayments" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "externalId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "failureReason" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "failureReason" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "recoveryProbability" DOUBLE PRECISION NOT NULL,
    "expectedRecovery" DECIMAL(14,2) NOT NULL,
    "recoveredAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "RecoveryCaseStatus" NOT NULL,
    "diagnosis" TEXT,
    "diagnosisConfidence" DOUBLE PRECISION,
    "recommendedAction" "RecoveryActionType",
    "escalationReason" TEXT,
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "decision" "RecoveryActionType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "evidence" JSONB,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL,
    "recoveryCaseId" TEXT NOT NULL,
    "actionType" "RecoveryActionType" NOT NULL,
    "status" "RecoveryActionStatus" NOT NULL,
    "attemptNumber" INTEGER,
    "amount" DECIMAL(14,2),
    "result" JSONB,
    "rejectionReason" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxAutomaticRetryAttempts" INTEGER NOT NULL DEFAULT 2,
    "maxAutomaticRecoveryAmount" DECIMAL(14,2) NOT NULL DEFAULT 10000,
    "manualApprovalAmount" DECIMAL(14,2) NOT NULL DEFAULT 25000,
    "maxCustomerActionsPerDay" INTEGER NOT NULL DEFAULT 3,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "recoveryCaseId" TEXT,
    "eventType" TEXT NOT NULL,
    "actor" "AuditActor" NOT NULL,
    "action" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datasetSize" INTEGER NOT NULL,
    "baselineAtRisk" DECIMAL(14,2) NOT NULL,
    "recoverAiAtRisk" DECIMAL(14,2) NOT NULL,
    "baselineRecovered" DECIMAL(14,2) NOT NULL,
    "recoverAiRecovered" DECIMAL(14,2) NOT NULL,
    "baselineRecoveryRate" DOUBLE PRECISION NOT NULL,
    "recoverAiRecoveryRate" DOUBLE PRECISION NOT NULL,
    "unnecessaryActions" INTEGER NOT NULL DEFAULT 0,
    "policyViolations" INTEGER NOT NULL DEFAULT 0,
    "manualEscalations" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE INDEX "Customer_merchantId_idx" ON "Customer"("merchantId");

-- CreateIndex
CREATE INDEX "Customer_merchantId_createdAt_idx" ON "Customer"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_merchantId_idx" ON "Transaction"("merchantId");

-- CreateIndex
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

-- CreateIndex
CREATE INDEX "Transaction_externalId_idx" ON "Transaction"("externalId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_merchantId_status_createdAt_idx" ON "Transaction"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_transactionId_idx" ON "PaymentAttempt"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_transactionId_attemptNumber_idx" ON "PaymentAttempt"("transactionId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCase_transactionId_key" ON "RecoveryCase"("transactionId");

-- CreateIndex
CREATE INDEX "RecoveryCase_merchantId_idx" ON "RecoveryCase"("merchantId");

-- CreateIndex
CREATE INDEX "RecoveryCase_status_idx" ON "RecoveryCase"("status");

-- CreateIndex
CREATE INDEX "RecoveryCase_merchantId_status_createdAt_idx" ON "RecoveryCase"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RecoveryCase_createdAt_idx" ON "RecoveryCase"("createdAt");

-- CreateIndex
CREATE INDEX "AgentDecision_recoveryCaseId_idx" ON "AgentDecision"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "AgentDecision_createdAt_idx" ON "AgentDecision"("createdAt");

-- CreateIndex
CREATE INDEX "RecoveryAction_recoveryCaseId_idx" ON "RecoveryAction"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "RecoveryAction_status_idx" ON "RecoveryAction"("status");

-- CreateIndex
CREATE INDEX "RecoveryAction_actionType_idx" ON "RecoveryAction"("actionType");

-- CreateIndex
CREATE INDEX "RecoveryAction_createdAt_idx" ON "RecoveryAction"("createdAt");

-- CreateIndex
CREATE INDEX "Policy_merchantId_idx" ON "Policy"("merchantId");

-- CreateIndex
CREATE INDEX "Policy_merchantId_active_idx" ON "Policy"("merchantId", "active");

-- CreateIndex
CREATE INDEX "AuditLog_merchantId_idx" ON "AuditLog"("merchantId");

-- CreateIndex
CREATE INDEX "AuditLog_recoveryCaseId_idx" ON "AuditLog"("recoveryCaseId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_merchantId_idx" ON "WebhookEvent"("merchantId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "EvaluationRun_merchantId_idx" ON "EvaluationRun"("merchantId");

-- CreateIndex
CREATE INDEX "EvaluationRun_startedAt_idx" ON "EvaluationRun"("startedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDecision" ADD CONSTRAINT "AgentDecision_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_recoveryCaseId_fkey" FOREIGN KEY ("recoveryCaseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRun" ADD CONSTRAINT "EvaluationRun_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
