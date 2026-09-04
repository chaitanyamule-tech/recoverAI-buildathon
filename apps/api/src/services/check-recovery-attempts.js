import prisma from "../lib/prisma.js";

async function main() {
  const recoveryCase =
    await prisma.recoveryCase.findFirst({
      where: {
        status: "RECOVERED",
      },
      include: {
        transaction: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!recoveryCase) {
    console.log("No recovered case found.");
    return;
  }

  const attempts =
    await prisma.paymentAttempt.findMany({
      where: {
        transactionId:
          recoveryCase.transactionId,
      },
      orderBy: {
        attemptNumber: "asc",
      },
    });

  console.log("\n📊 RECOVERED CASE");
  console.log({
    caseId: recoveryCase.id,
    transactionId:
      recoveryCase.transactionId,
    transactionStatus:
      recoveryCase.transaction.status,
    recoveredAmount:
      Number(recoveryCase.recoveredAmount),
  });

  console.log("\n💳 PAYMENT ATTEMPTS");

  console.table(
    attempts.map((attempt) => ({
      number: attempt.attemptNumber,
      type: attempt.attemptType,
      status: attempt.status,
      failureReason:
        attempt.failureReason,
      paymentMethod:
        attempt.paymentMethod,
      externalId:
        attempt.externalId,
    }))
  );
}

main()
  .catch((error) => {
    console.error(
      "❌ Check failed:",
      error
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });