import {
  analyzeRecoveryRisk,
} from "./risk.service.js";

const reliableCustomer = {
  totalPayments: 25,
  successfulPayments: 24,
  failedPayments: 1,
};

const unreliableCustomer = {
  totalPayments: 20,
  successfulPayments: 6,
  failedPayments: 14,
};

const tests = [
  {
    name: "Reliable customer + network timeout",
    input: {
      customer: reliableCustomer,
      amount: 2500,
      paymentMethod: "UPI",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 1,
    },
  },

  {
    name: "Unreliable customer + insufficient funds",
    input: {
      customer: unreliableCustomer,
      amount: 2500,
      paymentMethod: "CARD",
      failureReason: "INSUFFICIENT_FUNDS",
      attemptNumber: 1,
    },
  },

  {
    name: "Second attempt",
    input: {
      customer: reliableCustomer,
      amount: 2500,
      paymentMethod: "UPI",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 2,
    },
  },

  {
    name: "High value transaction",
    input: {
      customer: reliableCustomer,
      amount: 45000,
      paymentMethod: "CARD",
      failureReason: "BANK_ERROR",
      attemptNumber: 1,
    },
  },
];

console.log(
  "\n🧠 RecoverAI Risk Engine Tests\n"
);

for (const test of tests) {
  const result = analyzeRecoveryRisk(
    test.input
  );

  console.log(
    `\n${test.name}`
  );

  console.log(
    "────────────────────────────"
  );

  console.log(
    "Risk Score:",
    result.riskScore
  );

  console.log(
    "Recovery Probability:",
    result.recoveryProbability
  );

  console.log(
    "Expected Recovery:",
    `₹${result.expectedRecovery}`
  );

  console.log(
    "Priority:",
    result.priority
  );

  console.log(
    "Factors:",
    result.factors
  );
}