import {
  ACTIONS,
  evaluatePolicy,
} from "./policy.service.js";

const policy = {
  maxAutomaticRetryAttempts: 2,
  maxAutomaticRecoveryAmount: 10000,
  manualApprovalAmount: 25000,
  maxCustomerActionsPerDay: 3,
  cooldownMinutes: 30,
};

const scenarios = [
  {
    name: "Normal retry",
    requestedAction:
      ACTIONS.RETRY_PAYMENT,
    amount: 2500,
    attemptNumber: 1,
  },

  {
    name: "Second retry",
    requestedAction:
      ACTIONS.RETRY_PAYMENT,
    amount: 2500,
    attemptNumber: 2,
  },

  {
    name: "High-value retry",
    requestedAction:
      ACTIONS.RETRY_PAYMENT,
    amount: 45000,
    attemptNumber: 1,
  },

  {
    name: "Medium-value retry",
    requestedAction:
      ACTIONS.RETRY_PAYMENT,
    amount: 15000,
    attemptNumber: 1,
  },

  {
    name: "Reminder",
    requestedAction:
      ACTIONS.SEND_REMINDER,
    amount: 1200,
    attemptNumber: 1,
  },

  {
    name: "Daily action limit",
    requestedAction:
      ACTIONS.SEND_REMINDER,
    amount: 1200,
    attemptNumber: 1,
    customerActionsToday: 3,
  },
];

console.log(
  "\n🛡️ RecoverAI Policy Engine Tests\n"
);

for (const scenario of scenarios) {
  const result = evaluatePolicy({
    ...scenario,
    policy,
  });

  console.log(
    `\n${scenario.name}`
  );

  console.log(
    "────────────────────────────"
  );

  console.log(
    "Requested:",
    scenario.requestedAction
  );

  console.log(
    "Allowed:",
    result.allowed
  );

  console.log(
    "Final Action:",
    result.finalAction
  );

  console.log(
    "Reason:",
    result.reason
  );
}