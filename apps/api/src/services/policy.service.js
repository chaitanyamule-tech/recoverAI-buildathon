const ACTIONS = {
  RETRY_PAYMENT: "RETRY_PAYMENT",
  SEND_REMINDER: "SEND_REMINDER",
  OFFER_ALTERNATIVE_METHOD:
    "OFFER_ALTERNATIVE_METHOD",
  WAIT: "WAIT",
  ESCALATE: "ESCALATE",
  STOP: "STOP",
};

function checkRetryPolicy({
  amount,
  attemptNumber,
  policy,
}) {
  const numericAmount = Number(amount);

  if (
    attemptNumber >=
    policy.maxAutomaticRetryAttempts
  ) {
    return {
      allowed: false,
      finalAction: ACTIONS.STOP,
      reason:
        "Maximum automatic retry attempts reached.",
    };
  }

  if (
    numericAmount >
    Number(
      policy.maxAutomaticRecoveryAmount
    )
  ) {
    return {
      allowed: false,
      finalAction:
        numericAmount >=
        Number(policy.manualApprovalAmount)
          ? ACTIONS.ESCALATE
          : ACTIONS.WAIT,
      reason:
        numericAmount >=
        Number(policy.manualApprovalAmount)
          ? "Transaction requires human approval."
          : "Transaction exceeds automatic recovery amount.",
    };
  }

  return {
    allowed: true,
    finalAction: ACTIONS.RETRY_PAYMENT,
    reason:
      "Retry satisfies automatic recovery policy.",
  };
}

function checkReminderPolicy({
  amount,
  customerActionsToday = 0,
  policy,
}) {
  if (
    customerActionsToday >=
    policy.maxCustomerActionsPerDay
  ) {
    return {
      allowed: false,
      finalAction: ACTIONS.STOP,
      reason:
        "Customer daily action limit reached.",
    };
  }

  return {
    allowed: true,
    finalAction: ACTIONS.SEND_REMINDER,
    reason:
      "Reminder satisfies customer communication policy.",
  };
}

function checkAlternativeMethodPolicy({
  amount,
  customerActionsToday = 0,
  policy,
}) {
  if (
    customerActionsToday >=
    policy.maxCustomerActionsPerDay
  ) {
    return {
      allowed: false,
      finalAction: ACTIONS.STOP,
      reason:
        "Customer daily action limit reached.",
    };
  }

  return {
    allowed: true,
    finalAction:
      ACTIONS.OFFER_ALTERNATIVE_METHOD,
    reason:
      "Alternative payment method is permitted.",
  };
}

function checkEscalationPolicy({
  amount,
  policy,
}) {
  const numericAmount = Number(amount);

  if (
    numericAmount >=
    Number(policy.manualApprovalAmount)
  ) {
    return {
      allowed: true,
      finalAction: ACTIONS.ESCALATE,
      reason:
        "Transaction requires human approval.",
    };
  }

  return {
    allowed: true,
    finalAction: ACTIONS.ESCALATE,
    reason:
      "Recovery requires human review.",
  };
}

function evaluatePolicy({
  requestedAction,
  amount,
  attemptNumber = 1,
  customerActionsToday = 0,
  policy,
}) {
  if (!policy) {
    throw new Error(
      "Active recovery policy is required."
    );
  }

  if (
    !Object.values(ACTIONS).includes(
      requestedAction
    )
  ) {
    throw new Error(
      `Unsupported recovery action: ${requestedAction}`
    );
  }

  switch (requestedAction) {
    case ACTIONS.RETRY_PAYMENT:
      return checkRetryPolicy({
        amount,
        attemptNumber,
        policy,
      });

    case ACTIONS.SEND_REMINDER:
      return checkReminderPolicy({
        amount,
        customerActionsToday,
        policy,
      });

    case ACTIONS.OFFER_ALTERNATIVE_METHOD:
      return checkAlternativeMethodPolicy({
        amount,
        customerActionsToday,
        policy,
      });

    case ACTIONS.ESCALATE:
      return checkEscalationPolicy({
        amount,
        policy,
      });

    case ACTIONS.WAIT:
      return {
        allowed: true,
        finalAction: ACTIONS.WAIT,
        reason:
          "Waiting is always permitted.",
      };

    case ACTIONS.STOP:
      return {
        allowed: true,
        finalAction: ACTIONS.STOP,
        reason:
          "Recovery has been explicitly stopped.",
      };

    default:
      throw new Error(
        "Unexpected recovery action."
      );
  }
}

export {
  ACTIONS,
  evaluatePolicy,
};