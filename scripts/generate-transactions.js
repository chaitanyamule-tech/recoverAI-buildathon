import fs from "fs/promises";
import path from "path";

import prisma, {
  PaymentMethod,
  TransactionStatus,
} from "../apps/api/src/lib/prisma.js";

const TOTAL_TRANSACTIONS = 10000;
const START_DATE = new Date("2026-08-01T00:00:00+05:30");
const END_DATE = new Date("2026-08-31T23:59:59+05:30");

const PAYMENT_METHOD_WEIGHTS = {
  UPI: 0.45,
  CARD: 0.30,
  NETBANKING: 0.15,
  WALLET: 0.10,
};

const FAILURE_BASE_RATES = {
  HIGHLY_RELIABLE: 0.04,
  RELIABLE: 0.08,
  NORMAL: 0.16,
  UNSTABLE: 0.30,
  HIGH_FAILURE: 0.55,
  HIGH_VALUE: 0.10,
  NEW_CUSTOMER: 0.18,
};

const FAILURE_REASONS = {
  UPI: [
    "UPI_DECLINED",
    "NETWORK_TIMEOUT",
    "BANK_ERROR",
  ],
  CARD: [
    "BANK_ERROR",
    "NETWORK_TIMEOUT",
    "INSUFFICIENT_FUNDS",
  ],
  NETBANKING: [
    "BANK_ERROR",
    "NETWORK_TIMEOUT",
    "INSUFFICIENT_FUNDS",
  ],
  WALLET: [
    "BANK_ERROR",
    "NETWORK_TIMEOUT",
    "INSUFFICIENT_FUNDS",
  ],
};

const RECOVERY_TRUTH = {
  RETRY_PAYMENT: "RETRY_PAYMENT",
  SEND_REMINDER: "SEND_REMINDER",
  ESCALATE: "ESCALATE",
  STOP: "STOP",
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInteger(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedChoice(weightMap) {
  const random = Math.random();

  let cumulative = 0;

  for (const [key, weight] of Object.entries(weightMap)) {
    cumulative += weight;

    if (random <= cumulative) {
      return key;
    }
  }

  return Object.keys(weightMap)[0];
}

function generateTimestamp() {
  const timestamp =
    START_DATE.getTime() +
    Math.random() *
      (END_DATE.getTime() - START_DATE.getTime());

  return new Date(timestamp);
}

function generatePaymentMethod() {
  const method = weightedChoice(PAYMENT_METHOD_WEIGHTS);

  return PaymentMethod[method];
}

function getCustomerProfile(customer) {
  return customer?.metadata?.profile || "NORMAL";
}

function generateAmount(profile) {
  switch (profile) {
    case "HIGH_VALUE":
      return Number(
        randomBetween(15000, 75000).toFixed(2)
      );

    case "NEW_CUSTOMER":
      return Number(
        randomBetween(100, 5000).toFixed(2)
      );

    case "HIGH_FAILURE":
      return Number(
        randomBetween(200, 8000).toFixed(2)
      );

    case "HIGHLY_RELIABLE":
    case "RELIABLE":
      return Number(
        randomBetween(500, 10000).toFixed(2)
      );

    default:
      return Number(
        randomBetween(100, 15000).toFixed(2)
      );
  }
}

function isUpiDegradationWindow(date) {
  const hour = date.getHours();

  return hour >= 12 && hour < 14;
}

function isBankDegradationWindow(date) {
  const hour = date.getHours();

  return hour >= 18 && hour < 19;
}

function shouldFail(profile, paymentMethod, date) {
  let failureProbability =
    FAILURE_BASE_RATES[profile] ?? 0.16;

  // UPI degradation event.
  if (
    paymentMethod === PaymentMethod.UPI &&
    isUpiDegradationWindow(date)
  ) {
    failureProbability += 0.14;
  }

  // Card / netbanking degradation event.
  if (
    (paymentMethod === PaymentMethod.CARD ||
      paymentMethod === PaymentMethod.NETBANKING) &&
    isBankDegradationWindow(date)
  ) {
    failureProbability += 0.08;
  }

  // Slight randomness to avoid deterministic outcomes.
  failureProbability += randomBetween(-0.03, 0.03);

  failureProbability = Math.max(
    0.01,
    Math.min(0.85, failureProbability)
  );

  return Math.random() < failureProbability;
}

function generateFailureReason(paymentMethod, date) {
  // Make injected degradation visible in the data.
  if (
    paymentMethod === PaymentMethod.UPI &&
    isUpiDegradationWindow(date) &&
    Math.random() < 0.70
  ) {
    return "NETWORK_TIMEOUT";
  }

  if (
    (paymentMethod === PaymentMethod.CARD ||
      paymentMethod === PaymentMethod.NETBANKING) &&
    isBankDegradationWindow(date) &&
    Math.random() < 0.55
  ) {
    return "BANK_ERROR";
  }

  return randomItem(
    FAILURE_REASONS[paymentMethod] ||
      FAILURE_REASONS.CARD
  );
}

function calculateGroundTruth({
  status,
  amount,
  profile,
  failureReason,
  attemptNumber,
}) {
  if (status === "ABANDONED") {
    return {
      action: RECOVERY_TRUTH.SEND_REMINDER,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.45, 0.75).toFixed(3)
      ),
      reason: "Checkout abandonment",
    };
  }

  if (status !== "FAILED") {
    return {
      action: null,
      recoverable: false,
      simulatedRecoveryProbability: 0,
      reason: "No recovery required",
    };
  }

  // High-value payments require human handling.
  if (amount >= 25000) {
    return {
      action: RECOVERY_TRUTH.ESCALATE,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.50, 0.80).toFixed(3)
      ),
      reason: "High-value transaction",
    };
  }

  // Repeated failures should stop.
  if (
    attemptNumber >= 2 ||
    profile === "HIGH_FAILURE"
  ) {
    return {
      action: RECOVERY_TRUTH.STOP,
      recoverable: false,
      simulatedRecoveryProbability: Number(
        randomBetween(0.05, 0.25).toFixed(3)
      ),
      reason: "Repeated or low-probability failure",
    };
  }

  // Insufficient funds are less suitable for immediate retries.
  if (failureReason === "INSUFFICIENT_FUNDS") {
    return {
      action: RECOVERY_TRUTH.SEND_REMINDER,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.25, 0.50).toFixed(3)
      ),
      reason: "Insufficient funds",
    };
  }

  // Transient errors on healthy customers are strong retry cases.
  if (
    failureReason === "NETWORK_TIMEOUT" &&
    (profile === "HIGHLY_RELIABLE" ||
      profile === "RELIABLE" ||
      profile === "NORMAL") &&
    attemptNumber === 1
  ) {
    return {
      action: RECOVERY_TRUTH.RETRY_PAYMENT,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.70, 0.95).toFixed(3)
      ),
      reason: "Transient failure with favorable history",
    };
  }

  if (
    failureReason === "BANK_ERROR" &&
    attemptNumber === 1 &&
    profile !== "HIGH_FAILURE"
  ) {
    return {
      action: RECOVERY_TRUTH.RETRY_PAYMENT,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.55, 0.85).toFixed(3)
      ),
      reason: "Potentially transient bank error",
    };
  }

  if (
    failureReason === "UPI_DECLINED" &&
    attemptNumber === 1
  ) {
    return {
      action: RECOVERY_TRUTH.SEND_REMINDER,
      recoverable: true,
      simulatedRecoveryProbability: Number(
        randomBetween(0.35, 0.60).toFixed(3)
      ),
      reason: "Payment declined",
    };
  }

  return {
    action: RECOVERY_TRUTH.STOP,
    recoverable: false,
    simulatedRecoveryProbability: Number(
      randomBetween(0.10, 0.30).toFixed(3)
    ),
    reason: "Low-confidence recovery scenario",
  };
}

function calculateSimulatedRecoveryAmount(
  amount,
  probability
) {
  return Number(
    (amount * probability).toFixed(2)
  );
}

async function main() {
  console.log(
    "🚀 Starting RecoverAI synthetic dataset generation..."
  );

  const merchant = await prisma.merchant.findUnique({
    where: {
      email: "demo@recoverai.dev",
    },
  });

  if (!merchant) {
    throw new Error(
      "Demo merchant not found. Run `npm run seed` first."
    );
  }

  const customers = await prisma.customer.findMany({
    where: {
      merchantId: merchant.id,
    },
  });

  if (customers.length === 0) {
    throw new Error(
      "No customers found. Run the customer generator first."
    );
  }

  console.log(`✅ Merchant: ${merchant.name}`);
  console.log(`✅ Customers available: ${customers.length}`);
  console.log(`✅ Target transactions: ${TOTAL_TRANSACTIONS}`);

  const transactions = [];
  const groundTruth = [];

  const stats = {
    successful: 0,
    failed: 0,
    abandoned: 0,
    upi: 0,
    card: 0,
    netbanking: 0,
    wallet: 0,
    recoverable: 0,
    retry: 0,
    reminder: 0,
    escalate: 0,
    stop: 0,
    highValue: 0,
  };

  // Track attempts by customer.
  const customerAttempts = new Map();

  for (let i = 0; i < TOTAL_TRANSACTIONS; i++) {
    const customer = randomItem(customers);
    const profile = getCustomerProfile(customer);

    const paymentMethod =
      generatePaymentMethod();

    const createdAt = generateTimestamp();

    const abandon =
      Math.random() < 0.10;

    const amount = generateAmount(profile);

    const existingAttempts =
      customerAttempts.get(customer.id) || 0;

    const isRetryCandidate =
      existingAttempts > 0 &&
      Math.random() < 0.20;

    const attemptNumber = isRetryCandidate
      ? Math.min(existingAttempts + 1, 3)
      : 1;

    let status;
    let failureReason = null;

    if (abandon) {
      status = TransactionStatus.ABANDONED;
      failureReason = "CHECKOUT_ABANDONED";
      stats.abandoned++;
    } else if (
      shouldFail(
        profile,
        paymentMethod,
        createdAt
      )
    ) {
      status = TransactionStatus.FAILED;

      failureReason =
        generateFailureReason(
          paymentMethod,
          createdAt
        );

      stats.failed++;
    } else {
      status = TransactionStatus.CAPTURED;
      stats.successful++;
    }

    if (paymentMethod === PaymentMethod.UPI) {
      stats.upi++;
    }

    if (paymentMethod === PaymentMethod.CARD) {
      stats.card++;
    }

    if (
      paymentMethod ===
      PaymentMethod.NETBANKING
    ) {
      stats.netbanking++;
    }

    if (
      paymentMethod ===
      PaymentMethod.WALLET
    ) {
      stats.wallet++;
    }

    if (amount >= 25000) {
      stats.highValue++;
    }

    const truth = calculateGroundTruth({
      status:
        status === TransactionStatus.ABANDONED
          ? "ABANDONED"
          : status === TransactionStatus.FAILED
          ? "FAILED"
          : "CAPTURED",
      amount,
      profile,
      failureReason,
      attemptNumber,
    });

    if (truth.recoverable) {
      stats.recoverable++;
    }

    if (
      truth.action ===
      RECOVERY_TRUTH.RETRY_PAYMENT
    ) {
      stats.retry++;
    }

    if (
      truth.action ===
      RECOVERY_TRUTH.SEND_REMINDER
    ) {
      stats.reminder++;
    }

    if (
      truth.action ===
      RECOVERY_TRUTH.ESCALATE
    ) {
      stats.escalate++;
    }

    if (
      truth.action ===
      RECOVERY_TRUTH.STOP
    ) {
      stats.stop++;
    }

    const transactionId =
      `synthetic_${Date.now()}_${i}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    transactions.push({
      merchantId: merchant.id,
      customerId: customer.id,
      externalId: transactionId,
      amount,
      currency: "INR",
      paymentMethod,
      status,
      failureReason,
      description:
        "Synthetic RecoverAI evaluation transaction",
      metadata: {
        source: "synthetic_generator",
        datasetVersion: "v1",
        generatedAt: createdAt.toISOString(),
      },
      createdAt,
    });

    groundTruth.push({
      externalId: transactionId,
      customerId: customer.id,
      amount,
      paymentMethod,
      status,
      failureReason,
      attemptNumber,
      customerProfile: profile,

      // Hidden evaluation-only information.
      groundTruth: {
        expectedAction: truth.action,
        recoverable: truth.recoverable,
        simulatedRecoveryProbability:
          truth.simulatedRecoveryProbability,
        simulatedRecoverableAmount:
          calculateSimulatedRecoveryAmount(
            amount,
            truth.simulatedRecoveryProbability
          ),
        reason: truth.reason,
      },
    });

    customerAttempts.set(
      customer.id,
      existingAttempts + 1
    );
  }

  console.log(
    `📦 Generated ${transactions.length} transactions.`
  );

  /*
   * Insert transactions in batches.
   */
  const BATCH_SIZE = 500;

  for (
    let i = 0;
    i < transactions.length;
    i += BATCH_SIZE
  ) {
    const batch = transactions.slice(
      i,
      i + BATCH_SIZE
    );

    await prisma.transaction.createMany({
      data: batch,
    });

    console.log(
      `✅ Inserted ${Math.min(
        i + BATCH_SIZE,
        transactions.length
      )}/${transactions.length}`
    );
  }

  /*
   * Write hidden evaluation data separately.
   */
  const outputDirectory = path.resolve(
    "experiments/ground-truth"
  );

  await fs.mkdir(outputDirectory, {
    recursive: true,
  });

  const groundTruthPath = path.join(
    outputDirectory,
    "transactions-ground-truth-v1.json"
  );

  await fs.writeFile(
    groundTruthPath,
    JSON.stringify(
      {
        datasetVersion: "v1",
        generatedAt:
          new Date().toISOString(),
        totalTransactions:
          transactions.length,
        groundTruth,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n📊 DATASET SUMMARY");
  console.log(
    "────────────────────────────────"
  );

  console.log(
    `Total:           ${transactions.length}`
  );

  console.log(
    `Successful:      ${stats.successful}`
  );

  console.log(
    `Failed:          ${stats.failed}`
  );

  console.log(
    `Abandoned:       ${stats.abandoned}`
  );

  console.log(
    `UPI:             ${stats.upi}`
  );

  console.log(
    `CARD:            ${stats.card}`
  );

  console.log(
    `NETBANKING:      ${stats.netbanking}`
  );

  console.log(
    `WALLET:          ${stats.wallet}`
  );

  console.log(
    `High-value:      ${stats.highValue}`
  );

  console.log(
    `Recoverable:     ${stats.recoverable}`
  );

  console.log(
    `Retry cases:     ${stats.retry}`
  );

  console.log(
    `Reminder cases:  ${stats.reminder}`
  );

  console.log(
    `Escalations:     ${stats.escalate}`
  );

  console.log(
    `Stop cases:      ${stats.stop}`
  );

  console.log(
    "────────────────────────────────"
  );

  console.log(
    `\n🔐 Ground truth saved to:\n${groundTruthPath}`
  );

  console.log(
    "\n✅ Synthetic dataset generation completed."
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Transaction generation failed:"
    );
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });