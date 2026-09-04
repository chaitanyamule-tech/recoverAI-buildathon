import prisma from "../lib/prisma.js";

import {
  createRecoveryCase,
} from "./recovery.service.js";

async function main() {
  console.log(
    "\n⚡ RecoverAI Recovery Execution Test\n"
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
        recoveryCase: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!transaction) {
    throw new Error(
      "No suitable transaction available."
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
    "\nRunning complete recovery..."
  );

  const result =
    await createRecoveryCase(
      transaction.id
    );

  console.log(
    "\n🤖 AI:",
    result.aiDecision.action
  );

  console.log(
    "🛡️ Policy:",
    result.policyDecision
      .finalAction
  );

  console.log(
    "\n⚡ Execution:"
  );

  console.log(
    result.executionResult
  );

  const updatedCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: result.recoveryCase.id,
      },
    });

  console.log(
    "\n📊 Final Recovery Case:"
  );

  console.log({
    status: updatedCase.status,
    recoveredAmount:
      Number(
        updatedCase.recoveredAmount
      ),
  });
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Execution test failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });