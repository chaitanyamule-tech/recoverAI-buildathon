import "dotenv/config";

import {
  planRecovery,
} from "./agent.js";

const testCases = [
  {
    name: "High-confidence retry",
    transaction: {
      id: "TXN-DEMO-001",
      amount: 2500,
      currency: "INR",
      paymentMethod: "UPI",
      status: "FAILED",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 1,
    },

    customer: {
      totalPayments: 25,
      successfulPayments: 24,
      failedPayments: 1,
      totalSpent: 125000,
    },

    risk: {
      riskScore: 92,
      recoveryProbability: 0.9205,
      expectedRecovery: 2301.25,
      factors: {
        customerReliability: 0.96,
        failureRecoverability: 0.9,
        attemptFactor: 1,
      },
    },

    diagnosis: {
      category:
        "TRANSIENT_NETWORK_FAILURE",
      confidence: 0.91,
      severity: "MEDIUM",
      suggestedAction:
        "RETRY_PAYMENT",
      explanation:
        "Likely transient network failure on first attempt.",
    },

    policy: {
      maxAutomaticRetryAttempts: 2,
      maxAutomaticRecoveryAmount: 10000,
      manualApprovalAmount: 25000,
      maxCustomerActionsPerDay: 3,
      cooldownMinutes: 30,
    },
  },

  {
    name: "High-value escalation",
    transaction: {
      id: "TXN-DEMO-002",
      amount: 45000,
      currency: "INR",
      paymentMethod: "CARD",
      status: "FAILED",
      failureReason: "BANK_ERROR",
      attemptNumber: 1,
    },

    customer: {
      totalPayments: 18,
      successfulPayments: 16,
      failedPayments: 2,
      totalSpent: 320000,
    },

    risk: {
      riskScore: 81,
      recoveryProbability: 0.8055,
      expectedRecovery: 36247.5,
      factors: {
        customerReliability: 0.8889,
        failureRecoverability: 0.7,
        attemptFactor: 1,
        transactionValueFactor: 0.4,
      },
    },

    diagnosis: {
      category:
        "HIGH_VALUE_RECOVERY_CASE",
      confidence: 0.98,
      severity: "HIGH",
      suggestedAction: "ESCALATE",
      explanation:
        "High-value transaction requires cautious recovery handling.",
    },

    policy: {
      maxAutomaticRetryAttempts: 2,
      maxAutomaticRecoveryAmount: 10000,
      manualApprovalAmount: 25000,
      maxCustomerActionsPerDay: 3,
      cooldownMinutes: 30,
    },
  },

  {
    name: "Repeated failure stop",
    transaction: {
      id: "TXN-DEMO-003",
      amount: 3000,
      currency: "INR",
      paymentMethod: "UPI",
      status: "FAILED",
      failureReason: "NETWORK_TIMEOUT",
      attemptNumber: 3,
    },

    customer: {
      totalPayments: 20,
      successfulPayments: 8,
      failedPayments: 12,
      totalSpent: 24000,
    },

    risk: {
      riskScore: 44,
      recoveryProbability: 0.44,
      expectedRecovery: 1320,
      factors: {
        customerReliability: 0.4,
        failureRecoverability: 0.9,
        attemptFactor: 0.1,
      },
    },

    diagnosis: {
      category:
        "REPEATED_FAILURE",
      confidence: 0.97,
      severity: "HIGH",
      suggestedAction: "STOP",
      explanation:
        "Multiple payment attempts have already failed.",
    },

    policy: {
      maxAutomaticRetryAttempts: 2,
      maxAutomaticRecoveryAmount: 10000,
      manualApprovalAmount: 25000,
      maxCustomerActionsPerDay: 3,
      cooldownMinutes: 30,
    },
  },
];

async function main() {
  console.log(
    "\n🤖 RecoverAI Recovery Agent Test\n"
  );

  for (const testCase of testCases) {
    console.log(
      `\n${testCase.name}`
    );

    console.log(
      "────────────────────────────"
    );

    try {
      const result =
        await planRecovery(testCase);

      console.log(
        "Action:",
        result.action
      );

      console.log(
        "Confidence:",
        result.confidence
      );

      console.log(
        "Expected Recovery:",
        `₹${result.expectedRecovery}`
      );

      console.log(
        "Reasoning:",
        result.reasoning
      );

      console.log(
        "Evidence:"
      );

      for (const item of result.evidence) {
        console.log(`  • ${item}`);
      }

      console.log(
        "Model:",
        result.model
      );
    } catch (error) {
      console.error(
        "❌ Agent decision failed:"
      );
      console.error(error.message);
    }
  }
}

main();