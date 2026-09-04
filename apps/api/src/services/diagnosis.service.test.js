import {
  diagnoseTransaction,
  detectPaymentMethodDegradation,
} from "./diagnosis.service.js";

console.log(
  "\n🔎 RecoverAI Diagnosis Engine Tests\n"
);

const scenarios = [
  {
    name: "Network timeout",
    input: {
      amount: 2500,
      paymentMethod: "UPI",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 1,
    },
  },

  {
    name: "UPI decline",
    input: {
      amount: 1800,
      paymentMethod: "UPI",
      failureReason: "UPI_DECLINED",
      attemptNumber: 1,
    },
  },

  {
    name: "Insufficient funds",
    input: {
      amount: 5000,
      paymentMethod: "CARD",
      failureReason: "INSUFFICIENT_FUNDS",
      attemptNumber: 1,
    },
  },

  {
    name: "Repeated failure",
    input: {
      amount: 3000,
      paymentMethod: "UPI",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 3,
    },
  },

  {
    name: "High value",
    input: {
      amount: 45000,
      paymentMethod: "CARD",
      failureReason: "BANK_ERROR",
      attemptNumber: 1,
    },
  },

  {
    name: "Checkout abandonment",
    input: {
      amount: 1200,
      paymentMethod: "UPI",
      failureReason: "CHECKOUT_ABANDONED",
      attemptNumber: 1,
    },
  },
];

for (const scenario of scenarios) {
  const result = diagnoseTransaction(
    scenario.input
  );

  console.log(
    `\n${scenario.name}`
  );

  console.log(
    "────────────────────────────"
  );

  console.log(
    "Category:",
    result.category
  );

  console.log(
    "Confidence:",
    result.confidence
  );

  console.log(
    "Severity:",
    result.severity
  );

  console.log(
    "Suggested Action:",
    result.suggestedAction
  );

  console.log(
    "Explanation:",
    result.explanation
  );
}

console.log(
  "\n📉 Payment Degradation Test"
);

const degradation =
  detectPaymentMethodDegradation({
    baselineFailureRate: 0.052,
    currentFailureRate: 0.184,
    minimumCurrentSamples: 100,
  });

console.log(
  degradation
);