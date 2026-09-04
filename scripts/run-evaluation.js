import { runEvaluation } from "../src/services/evaluation.service.js";

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

try {
  const result = runEvaluation();

  console.log("\n========================================");
  console.log("        RecoverAI Evaluation");
  console.log("========================================\n");

  console.log(
    "Transactions evaluated:",
    result.transactionsEvaluated
  );

  console.log(
    "Total revenue:",
    money(result.totalRevenue)
  );

  console.log(
    "Revenue at risk:",
    money(result.revenueAtRisk)
  );

  console.log("\n--------------- BASELINE ---------------");

  console.log(
    "Recovered:",
    money(result.baseline.recoveredAmount)
  );

  console.log(
    "Recovery rate:",
    result.baseline.recoveryRate.toFixed(2) + "%"
  );

  console.log(
    "Successful recoveries:",
    result.baseline.successfulRecoveries
  );

  console.log(
    "Actions:",
    result.baseline.actions
  );

  console.log(
    "Escalations:",
    result.baseline.escalations
  );

  console.log(
    "Stopped:",
    result.baseline.stopped
  );

  console.log(
    "False positives:",
    result.baseline.falsePositives
  );

  console.log("\n------------- RECOVERAI ----------------");

  console.log(
    "Recovered:",
    money(result.recoverAI.recoveredAmount)
  );

  console.log(
    "Recovery rate:",
    result.recoverAI.recoveryRate.toFixed(2) + "%"
  );

  console.log(
    "Successful recoveries:",
    result.recoverAI.successfulRecoveries
  );

  console.log(
    "Actions:",
    result.recoverAI.actions
  );

  console.log(
    "Escalations:",
    result.recoverAI.escalations
  );

  console.log(
    "Stopped:",
    result.recoverAI.stopped
  );

  console.log(
    "False positives:",
    result.recoverAI.falsePositives
  );

  console.log("\n------------- IMPACT -------------------");

  console.log(
    "Additional recovered:",
    money(result.comparison.additionalRecovered)
  );

  console.log(
    "Recovery lift:",
    result.comparison.recoveryLiftPercent.toFixed(2) + "%"
  );

  console.log("\n---------- DECISION BREAKDOWN -----------");

  console.log(
    "\nBaseline:",
    result.decisionBreakdown.baseline
  );

  console.log(
    "\nRecoverAI:",
    result.decisionBreakdown.recoverAI
  );

  console.log("\n========================================\n");
} catch (error) {
  console.error("\n❌ Evaluation failed:");
  console.error(error);

  process.exitCode = 1;
}