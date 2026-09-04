import prisma from "../lib/prisma.js";

import {
  createRecoveryCase,
} from "./recovery.service.js";

async function main() {
  console.log(
    "\n🚀 RecoverAI End-to-End Recovery Test\n"
  );

  const transaction =
    await prisma.transaction.findFirst({
      where: {
        status: "FAILED",
        failureReason:
          "NETWORK_TIMEOUT",
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
      "No suitable failed transaction found."
    );
  }

  console.log(
    "Transaction:",
    transaction.id
  );

  console.log(
    "Amount:",
    `₹${transaction.amount}`
  );

  console.log(
    "Failure:",
    transaction.failureReason
  );

  console.log(
    "\nRunning recovery orchestrator..."
  );

  const result =
    await createRecoveryCase(
      transaction.id
    );

  console.log(
    "\n🧠 RISK"
  );

  console.log(
    "Score:",
    result.risk.riskScore
  );

  console.log(
    "Probability:",
    result.risk
      .recoveryProbability
  );

  console.log(
    "Expected recovery:",
    `₹${result.risk.expectedRecovery}`
  );

  console.log(
    "\n🔎 DIAGNOSIS"
  );

  console.log(
    "Category:",
    result.diagnosis.category
  );

  console.log(
    "Suggested action:",
    result.diagnosis
      .suggestedAction
  );

  console.log(
    "\n🤖 AI DECISION"
  );

  console.log(
    "Action:",
    result.aiDecision.action
  );

  console.log(
    "Confidence:",
    result.aiDecision
      .confidence
  );

  console.log(
    "Reasoning:",
    result.aiDecision
      .reasoning
  );

  console.log(
    "\n🛡️ POLICY"
  );

  console.log(
    "Allowed:",
    result.policyDecision.allowed
  );

  console.log(
    "Final action:",
    result.policyDecision
      .finalAction
  );

  console.log(
    "Reason:",
    result.policyDecision
      .reason
  );

  console.log(
    "\n✅ Recovery case:",
    result.recoveryCase.id
  );

  console.log(
    "✅ Recovery action:",
    result.recoveryAction.id
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Recovery orchestrator test failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });