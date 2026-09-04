import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groundTruthPath = path.resolve(
  __dirname,
  "../../../../experiments/ground-truth/transactions-ground-truth-v1.json"
);

function loadGroundTruth() {
  if (!fs.existsSync(groundTruthPath)) {
    throw new Error(
      `Ground truth file not found: ${groundTruthPath}`
    );
  }

  const raw = fs.readFileSync(groundTruthPath, "utf8");

  const data = JSON.parse(raw);

  if (!Array.isArray(data.groundTruth)) {
    throw new Error("Invalid ground truth format.");
  }

  return data.groundTruth;
}

/**
 * Baseline:
 * - Only failed payments are considered.
 * - First-attempt recoverable failures are retried.
 * - High-value cases are escalated instead of auto-retried.
 * - Other cases are stopped.
 */
function baselineDecision(transaction) {
  if (transaction.status !== "FAILED") {
    return "NO_ACTION";
  }

  if (transaction.attemptNumber >= 2) {
    return "STOP";
  }

  if (transaction.amount >= 25000) {
    return "ESCALATE";
  }

  return "RETRY_PAYMENT";
}

/**
 * RecoverAI deterministic benchmark decision.
 *
 * This mirrors the production philosophy:
 * risk + diagnosis + policy.
 *
 * Gemini remains the reasoning layer in live execution,
 * while batch evaluation remains deterministic/reproducible.
 */
function recoverAIDecision(transaction) {
  if (transaction.status !== "FAILED") {
    return "NO_ACTION";
  }

  const {
    amount,
    failureReason,
    attemptNumber,
    customerProfile,
  } = transaction;

  // Stopping rule
  if (attemptNumber >= 3) {
    return "STOP";
  }

  // High-value recovery cases require escalation
  if (amount >= 25000) {
    return "ESCALATE";
  }

  // Insufficient funds → reminder
  if (failureReason === "INSUFFICIENT_FUNDS") {
    return "SEND_REMINDER";
  }

  // Checkout abandonment → reminder
  if (failureReason === "CHECKOUT_ABANDONED") {
    return "SEND_REMINDER";
  }

  // UPI decline → alternative payment method
  if (failureReason === "UPI_DECLINED") {
    return "OFFER_ALTERNATIVE_METHOD";
  }

  // Strong retry candidates
  const retryProfiles = new Set([
    "RELIABLE",
    "HIGHLY_RELIABLE",
    "HIGH_VALUE",
  ]);

  const retryFailures = new Set([
    "NETWORK_TIMEOUT",
    "BANK_ERROR",
  ]);

  if (
    attemptNumber <= 1 &&
    retryFailures.has(failureReason) &&
    retryProfiles.has(customerProfile)
  ) {
    return "RETRY_PAYMENT";
  }

  // Lower-confidence transient failures
  if (
    attemptNumber === 1 &&
    retryFailures.has(failureReason)
  ) {
    return "RETRY_PAYMENT";
  }

  return "STOP";
}

function calculateRecoveryAmount(transaction, decision) {
  const groundTruth = transaction.groundTruth;

  if (!groundTruth) {
    return 0;
  }

  if (decision === "NO_ACTION") {
    return 0;
  }

  if (groundTruth.recoverable !== true) {
    return 0;
  }

  /*
   * Recovery is credited only when the strategy
   * chooses the intervention expected by ground truth.
   */
  if (decision !== groundTruth.expectedAction) {
    return 0;
  }

  return Number(groundTruth.simulatedRecoverableAmount) || 0;
}

function calculateBaseline(transaction) {
  const decision = baselineDecision(transaction);

  return {
    decision,
    recoveredAmount: calculateRecoveryAmount(
      transaction,
      decision
    ),
  };
}

function calculateRecoverAI(transaction) {
  const decision = recoverAIDecision(transaction);

  return {
    decision,
    recoveredAmount: calculateRecoveryAmount(
      transaction,
      decision
    ),
  };
}

export function runEvaluation() {
  const transactions = loadGroundTruth();

  let totalRevenue = 0;
  let revenueAtRisk = 0;

  let baselineRecovered = 0;
  let recoverAIRecovered = 0;

  let baselineActions = 0;
  let recoverAIActions = 0;

  let baselineSuccessful = 0;
  let recoverAISuccessful = 0;

  let baselineEscalations = 0;
  let recoverAIEscalations = 0;

  let baselineStopped = 0;
  let recoverAIStopped = 0;

  let unnecessaryBaseline = 0;
let unnecessaryRecoverAI = 0;

let incorrectInterventionBaseline = 0;
let incorrectInterventionRecoverAI = 0;

  let baselineCorrectActions = 0;
  let recoverAICorrectActions = 0;

  const decisionBreakdown = {
    baseline: {},
    recoverAI: {},
  };

  for (const transaction of transactions) {
    totalRevenue += transaction.amount;

    if (transaction.groundTruth.recoverable === true) {
      revenueAtRisk += transaction.amount;
    }

    const baseline = calculateBaseline(transaction);
    const ai = calculateRecoverAI(transaction);

    baselineRecovered += baseline.recoveredAmount;
    recoverAIRecovered += ai.recoveredAmount;


    if (
    transaction.groundTruth.expectedAction ===          baseline.decision
) {
  baselineCorrectActions++;
}

if (
  transaction.groundTruth.expectedAction === ai.decision
) {
  recoverAICorrectActions++;
}
    if (baseline.decision !== "NO_ACTION") {
      baselineActions++;
    }

    if (ai.decision !== "NO_ACTION") {
      recoverAIActions++;
    }

    if (baseline.recoveredAmount > 0) {
      baselineSuccessful++;
    }

    if (ai.recoveredAmount > 0) {
      recoverAISuccessful++;
    }

    if (baseline.decision === "ESCALATE") {
      baselineEscalations++;
    }

    if (ai.decision === "ESCALATE") {
      recoverAIEscalations++;
    }

    if (baseline.decision === "STOP") {
      baselineStopped++;
    }

    if (ai.decision === "STOP") {
      recoverAIStopped++;
    }

   const expectedAction =
  transaction.groundTruth.expectedAction;

if (
  expectedAction === null &&
  baseline.decision !== "NO_ACTION"
) {
  unnecessaryBaseline++;
}

if (
  expectedAction === null &&
  ai.decision !== "NO_ACTION"
) {
  unnecessaryRecoverAI++;
}

if (
  expectedAction !== null &&
  baseline.decision !== expectedAction
) {
  incorrectInterventionBaseline++;
}

if (
  expectedAction !== null &&
  ai.decision !== expectedAction
) {
  incorrectInterventionRecoverAI++;
}

    decisionBreakdown.baseline[baseline.decision] =
      (decisionBreakdown.baseline[baseline.decision] || 0) + 1;

    decisionBreakdown.recoverAI[ai.decision] =
      (decisionBreakdown.recoverAI[ai.decision] || 0) + 1;
  }

  const additionalRecovered =
    recoverAIRecovered - baselineRecovered;

  const recoveryLift =
    baselineRecovered === 0
      ? 0
      : (additionalRecovered / baselineRecovered) * 100;

  const baselineRecoveryRate =
    revenueAtRisk === 0
      ? 0
      : (baselineRecovered / revenueAtRisk) * 100;

  const recoverAIRecoveryRate =
    revenueAtRisk === 0
      ? 0
      : (recoverAIRecovered / revenueAtRisk) * 100;

  return {
    datasetVersion: "v1",
    transactionsEvaluated: transactions.length,
    correctActions: baselineCorrectActions,
    totalRevenue,
    revenueAtRisk,

    baseline: {
  recoveredAmount: baselineRecovered,
  recoveryRate: baselineRecoveryRate,
  successfulRecoveries: baselineSuccessful,
  actions: baselineActions,
  escalations: baselineEscalations,
  stopped: baselineStopped,
  unnecessaryInterventions: unnecessaryBaseline,
  incorrectInterventions:      incorrectInterventionBaseline,
  correctActions: baselineCorrectActions,
},

    recoverAI: {
  recoveredAmount: recoverAIRecovered,
  recoveryRate: recoverAIRecoveryRate,
  successfulRecoveries: recoverAISuccessful,
  actions: recoverAIActions,
  escalations: recoverAIEscalations,
  stopped: recoverAIStopped,
  unnecessaryInterventions: unnecessaryRecoverAI,
  incorrectInterventions: incorrectInterventionRecoverAI,
  correctActions: recoverAICorrectActions,
},

    comparison: {
      additionalRecovered,
      recoveryLiftPercent: recoveryLift,
    },

    decisionBreakdown,
  };
}