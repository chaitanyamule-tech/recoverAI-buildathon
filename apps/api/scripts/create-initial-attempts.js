import prisma from "../src/lib/prisma.js";

async function main() {
  console.log(
    "\n🔄 Creating initial payment attempts...\n"
  );

  const merchant =
    await prisma.merchant.findUnique({
      where: {
        email: "demo@recoverai.dev",
      },
    });

  if (!merchant) {
    throw new Error(
      "Demo merchant not found."
    );
  }

  const transactions =
    await prisma.transaction.findMany({
      where: {
        merchantId: merchant.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

  console.log(
    `✅ Transactions found: ${transactions.length}`
  );

  let created = 0;
  let skipped = 0;

  for (const transaction of transactions) {
    const existing =
      await prisma.paymentAttempt.findFirst({
        where: {
          transactionId:
            transaction.id,
        },
      });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.paymentAttempt.create({
      data: {
        transactionId:
          transaction.id,

        attemptNumber: 1,

        attemptType: "INITIAL",

        status:
          transaction.status,

        failureReason:
          transaction.failureReason,

        paymentMethod:
          transaction.paymentMethod,

        externalId:
          transaction.externalId,
      },
    });

    created++;
  }

  console.log(
    `✅ Initial attempts created: ${created}`
  );

  console.log(
    `⏭️ Already existed: ${skipped}`
  );

  const totalAttempts =
    await prisma.paymentAttempt.count({
      where: {
        transaction: {
          merchantId:
            merchant.id,
        },
      },
    });

  console.log(
    `\n📊 Total payment attempts: ${totalAttempts}`
  );

  console.log(
    "\n✅ Initial payment-attempt backfill complete."
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Backfill failed:"
    );

    console.error(error.message);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });