import prisma from "../lib/prisma.js";

import {
  executeRecoveryAction,
} from "./executor.service.js";


import {
  analyzeRecoveryRisk,
} from "./risk.service.js";

import {
  diagnoseTransaction,
} from "./diagnosis.service.js";

import {
  planRecovery,
} from "../ai/agent.js";

import {
  evaluatePolicy,
} from "./policy.service.js";

async function createRecoveryCase(
  transactionId,
  {
    executionMode = "SIMULATION",
  } = {}
) {
  const transaction =
    await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        customer: true,
      },
    });

  if (!transaction) {
    throw new Error(
      "Transaction not found."
    );
  }

  // Recovery is relevant only for failed/abandoned
  // transactions.
  if (
    transaction.status !== "FAILED" &&
    transaction.status !== "ABANDONED"
  ) {
    throw new Error(
      "Transaction is not eligible for recovery."
    );
  }

  // --------------------------------------------------
  // Determine current attempt number.
  // --------------------------------------------------

  const attempts =
    await prisma.paymentAttempt.count({
      where: {
        transactionId: transaction.id,
      },
    });

  const attemptNumber =
    Math.max(attempts, 1);

  // --------------------------------------------------
  // Risk analysis.
  // --------------------------------------------------

  const risk = analyzeRecoveryRisk({
    customer: transaction.customer,
    amount: transaction.amount,
    paymentMethod:
      transaction.paymentMethod,
    failureReason:
      transaction.failureReason,
    attemptNumber,
  });

  // --------------------------------------------------
  // Diagnosis.
  // --------------------------------------------------

  const diagnosis =
    diagnoseTransaction({
      amount: transaction.amount,
      paymentMethod:
        transaction.paymentMethod,
      failureReason:
        transaction.failureReason,
      attemptNumber,
    });

  // --------------------------------------------------
  // Active policy.
  // --------------------------------------------------

  const policy =
    await prisma.policy.findFirst({
      where: {
        merchantId:
          transaction.merchantId,
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!policy) {
    throw new Error(
      "No active recovery policy found."
    );
  }

  // --------------------------------------------------
  // Create recovery case first.
  // --------------------------------------------------

  const recoveryCase =
    await prisma.recoveryCase.create({
      data: {
        merchantId:
          transaction.merchantId,

        transactionId:
          transaction.id,

        riskScore:
          risk.riskScore,

        recoveryProbability:
          risk.recoveryProbability,

        expectedRecovery:
          risk.expectedRecovery,

        status: "ANALYZING",

        diagnosis:
          diagnosis.explanation,

        diagnosisConfidence:
          diagnosis.confidence,

        recommendedAction:
          diagnosis.suggestedAction,
      },
    });

	async function createDemoRecoveryCase() {
  const transaction =
    await prisma.transaction.findFirst({
      where: {
        status: "FAILED",
        failureReason: "NETWORK_TIMEOUT",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!transaction) {
    throw new Error(
      "No suitable failed transaction found for demo."
    );
  }

  return createRecoveryCase(
    transaction.id,
    {
      executionMode: "LIVE_TEST",
    }
  );
}


  // --------------------------------------------------
  // Ask Gemini to plan the recovery.
  // --------------------------------------------------

  const agentDecision =
    await planRecovery({
      transaction: {
        id: transaction.id,
        externalId:
          transaction.externalId,
        amount:
          Number(transaction.amount),
        currency:
          transaction.currency,
        paymentMethod:
          transaction.paymentMethod,
        status:
          transaction.status,
        failureReason:
          transaction.failureReason,
        attemptNumber,
      },

      customer: {
        totalPayments:
          transaction.customer
            .totalPayments,

        successfulPayments:
          transaction.customer
            .successfulPayments,

        failedPayments:
          transaction.customer
            .failedPayments,

        totalSpent:
          Number(
            transaction.customer.totalSpent
          ),
      },

      risk,

      diagnosis,

      policy: {
        maxAutomaticRetryAttempts:
          policy
            .maxAutomaticRetryAttempts,

        maxAutomaticRecoveryAmount:
          Number(
            policy
              .maxAutomaticRecoveryAmount
          ),

        manualApprovalAmount:
          Number(
            policy.manualApprovalAmount
          ),

        maxCustomerActionsPerDay:
          policy
            .maxCustomerActionsPerDay,

        cooldownMinutes:
          policy.cooldownMinutes,
      },
    });

  // --------------------------------------------------
  // Save AI decision.
  // --------------------------------------------------

  await prisma.agentDecision.create({
    data: {
      recoveryCaseId:
        recoveryCase.id,

      decision:
        agentDecision.action,

      confidence:
        agentDecision.confidence,

      reasoning:
        agentDecision.reasoning,

      evidence:
        agentDecision.evidence,

      model:
        agentDecision.model,
    },
  });

  // --------------------------------------------------
  // Update state.
  // --------------------------------------------------

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "PLANNED",

      recommendedAction:
        agentDecision.action,
    },
  });

  // --------------------------------------------------
  // Policy validation.
  // --------------------------------------------------

  const policyDecision =
    evaluatePolicy({
      requestedAction:
        agentDecision.action,

      amount:
        Number(transaction.amount),

      attemptNumber,

      customerActionsToday: 0,

      policy,
    });

    await prisma.recoveryCase.update({
  where: {
    id: recoveryCase.id,
  },

  data: {
    status:
      policyDecision.finalAction ===
      "ESCALATE"
        ? "ESCALATED"
        : policyDecision.finalAction ===
          "STOP"
        ? "STOPPED"
        : policyDecision.allowed
        ? "APPROVED"
        : "ESCALATED",
  },
});

const updatedRecoveryCase =
  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status:
        policyDecision.finalAction ===
        "ESCALATE"
          ? "ESCALATED"
          : policyDecision.finalAction ===
            "STOP"
          ? "STOPPED"
          : policyDecision.allowed
          ? "APPROVED"
          : "ESCALATED",
    },
  });

  const finalStatus =
    policyDecision.finalAction ===
    "ESCALATE"
      ? "ESCALATED"
      : policyDecision.finalAction ===
        "STOP"
      ? "STOPPED"
      : policyDecision.allowed
      ? "APPROVED"
      : "ESCALATED";

  // --------------------------------------------------
  // Create recovery action.
  // --------------------------------------------------

  const recoveryAction =
    await prisma.recoveryAction.create({
      data: {
        recoveryCaseId:
          recoveryCase.id,

        actionType:
          policyDecision.finalAction,

        status:
            policyDecision.allowed ||
            policyDecision.finalAction ===
                 "ESCALATE" ||
            policyDecision.finalAction ===
                  "STOP"
                   ? "APPROVED"
                   : "REJECTED",

        attemptNumber,

        amount:
          transaction.amount,

        result: {
          aiRecommendation:
            agentDecision.action,

          policyResult:
            policyDecision,

          riskScore:
            risk.riskScore,

          recoveryProbability:
            risk.recoveryProbability,
        },

        rejectionReason:
          policyDecision.allowed
            ? null
            : policyDecision.reason,
      },
    });


let executionResult = null;

if (
  executionMode === "SIMULATION" &&
  (
    policyDecision.allowed ||
    policyDecision.finalAction === "ESCALATE" ||
    policyDecision.finalAction === "STOP"
  )
) {
  executionResult =
    await executeRecoveryAction({
      recoveryCaseId:
        recoveryCase.id,
    });
}


  // --------------------------------------------------
  // Audit.
  // --------------------------------------------------

  await prisma.auditLog.create({
    data: {
      merchantId:
        transaction.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_PLANNED",

      actor:
        "AI",

      action:
        agentDecision.action,

      status:
        finalStatus,

      metadata: {
        riskScore:
          risk.riskScore,

        recoveryProbability:
          risk.recoveryProbability,

        diagnosis:
          diagnosis.category,

        policyResult:
          policyDecision,

        finalAction:
          policyDecision.finalAction,
      },
    },
  });

  // --------------------------------------------------
  // Final response.
  // --------------------------------------------------

    return {
    recoveryCase:
      updatedRecoveryCase,
    risk,
    diagnosis,
    aiDecision:
      agentDecision,
    policyDecision,
    recoveryAction,
    executionResult,
  };
}

async function createDemoRecoveryCase() {
  const transaction =
    await prisma.transaction.findFirst({
      where: {
        status: "FAILED",

        failureReason: "NETWORK_TIMEOUT",

        // Never reuse a transaction that already
        // has a RecoveryCase.
        recoveryCase: null,

        // Must remain below the automatic recovery limit.
        amount: {
          lt: 10000,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  if (!transaction) {
    throw new Error(
      "No unused eligible transaction is available for the demo."
    );
  }

  return createRecoveryCase(
    transaction.id,
    {
      executionMode: "LIVE_TEST",
    }
  );
}

export {
  createRecoveryCase,
  createDemoRecoveryCase,
};