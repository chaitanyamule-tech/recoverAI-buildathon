import prisma from "../lib/prisma.js";

import {
  createRecoveryCase,
} from "./recovery.service.js";

async function main() {
  console.log(
    "\n🧪 Creating LIVE TEST recovery case\n"
  );

  const transaction =
    await prisma.transaction.findFirst({
      where: {
        status: "FAILED",
        failureReason: "NETWORK_TIMEOUT",
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
      "No suitable transaction found."
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

  const result =
    await createRecoveryCase(
      transaction.id,
      {
        executionMode: "LIVE_TEST",
      }
    );

  console.log(
    "\n🤖 AI:",
    result.aiDecision.action
  );

  console.log(
    "🛡️ Policy:",
    result.policyDecision.finalAction
  );

  console.log(
    "Allowed:",
    result.policyDecision.allowed
  );

  console.log(
    "\n✅ Recovery Case:"
  );

  console.log(
    result.recoveryCase.id
  );

  console.log(
    "Status:",
    result.recoveryCase.status
  );

  console.log(
    "\n✅ Recovery Action:"
  );

  console.log(
    result.recoveryAction.id
  );

  console.log(
    "Status:",
    result.recoveryAction.status
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Live recovery test failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });