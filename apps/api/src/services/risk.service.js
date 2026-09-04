const FAILURE_RECOVERABILITY = {
  NETWORK_TIMEOUT: 0.90,
  BANK_ERROR: 0.70,
  UPI_DECLINED: 0.50,
  INSUFFICIENT_FUNDS: 0.35,
  UNKNOWN: 0.25,
  CHECKOUT_ABANDONED: 0.65,
};

const PAYMENT_METHOD_CONTEXT = {
  UPI: 0.70,
  CARD: 0.65,
  NETBANKING: 0.60,
  WALLET: 0.60,
  OTHER: 0.50,
};

const WEIGHTS = {
  CUSTOMER_RELIABILITY: 0.30,
  FAILURE_RECOVERABILITY: 0.25,
  ATTEMPT: 0.20,
  PAYMENT_METHOD: 0.10,
  TRANSACTION_VALUE: 0.10,
  CONTEXT: 0.05,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function calculateCustomerReliability(customer) {
  if (!customer) {
    return 0.5;
  }

  const totalPayments = Number(
    customer.totalPayments || 0
  );

  const successfulPayments = Number(
    customer.successfulPayments || 0
  );

  // Not enough history → neutral score.
  if (totalPayments < 3) {
    return 0.5;
  }

  return clamp(
    successfulPayments / totalPayments
  );
}

function calculateFailureRecoverability(
  failureReason
) {
  return (
    FAILURE_RECOVERABILITY[failureReason] ??
    FAILURE_RECOVERABILITY.UNKNOWN
  );
}

function calculateAttemptFactor(attemptNumber) {
  if (!attemptNumber || attemptNumber <= 1) {
    return 1.0;
  }

  if (attemptNumber === 2) {
    return 0.50;
  }

  return 0.10;
}

function calculateTransactionValueFactor(
  amount
) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return 0.5;
  }

  if (numericAmount < 5000) {
    return 1.0;
  }

  if (numericAmount < 10000) {
    return 0.85;
  }

  if (numericAmount < 25000) {
    return 0.65;
  }

  return 0.40;
}

function calculatePaymentMethodFactor(
  paymentMethod
) {
  return (
    PAYMENT_METHOD_CONTEXT[paymentMethod] ??
    PAYMENT_METHOD_CONTEXT.OTHER
  );
}

function calculateRecoveryScore({
  customer,
  amount,
  paymentMethod,
  failureReason,
  attemptNumber = 1,
}) {
  const customerReliability =
    calculateCustomerReliability(customer);

  const failureRecoverability =
    calculateFailureRecoverability(
      failureReason
    );

  const attemptFactor =
    calculateAttemptFactor(attemptNumber);

  const paymentMethodFactor =
    calculatePaymentMethodFactor(
      paymentMethod
    );

  const transactionValueFactor =
    calculateTransactionValueFactor(amount);

  /*
   * Context is intentionally neutral in v1.
   * Later we will replace this with:
   * - recent payment method failure rates
   * - degradation detection
   * - time-window context
   */
  const contextFactor = 0.75;

  const weightedScore =
    customerReliability *
      WEIGHTS.CUSTOMER_RELIABILITY +
    failureRecoverability *
      WEIGHTS.FAILURE_RECOVERABILITY +
    attemptFactor *
      WEIGHTS.ATTEMPT +
    paymentMethodFactor *
      WEIGHTS.PAYMENT_METHOD +
    transactionValueFactor *
      WEIGHTS.TRANSACTION_VALUE +
    contextFactor *
      WEIGHTS.CONTEXT;

  const recoveryProbability = clamp(
    weightedScore
  );

  const riskScore = Math.round(
    recoveryProbability * 100
  );

  const expectedRecovery = Number(
    (Number(amount) * recoveryProbability).toFixed(
      2
    )
  );

  return {
    riskScore,
    recoveryProbability: Number(
      recoveryProbability.toFixed(4)
    ),
    expectedRecovery,

    factors: {
      customerReliability: Number(
        customerReliability.toFixed(4)
      ),

      failureRecoverability: Number(
        failureRecoverability.toFixed(4)
      ),

      attemptFactor: Number(
        attemptFactor.toFixed(4)
      ),

      paymentMethodFactor: Number(
        paymentMethodFactor.toFixed(4)
      ),

      transactionValueFactor: Number(
        transactionValueFactor.toFixed(4)
      ),

      contextFactor: Number(
        contextFactor.toFixed(4)
      ),
    },
  };
}

function classifyRecoveryPriority(
  recoveryProbability
) {
  if (recoveryProbability >= 0.75) {
    return "HIGH_PRIORITY";
  }

  if (recoveryProbability >= 0.50) {
    return "MEDIUM_PRIORITY";
  }

  if (recoveryProbability >= 0.30) {
    return "LOW_PRIORITY";
  }

  return "VERY_LOW_PRIORITY";
}

function analyzeRecoveryRisk({
  customer,
  amount,
  paymentMethod,
  failureReason,
  attemptNumber = 1,
}) {
  if (!amount || Number(amount) <= 0) {
    throw new Error(
      "Transaction amount must be greater than zero."
    );
  }

  const result = calculateRecoveryScore({
    customer,
    amount,
    paymentMethod,
    failureReason,
    attemptNumber,
  });

  return {
    ...result,
    priority: classifyRecoveryPriority(
      result.recoveryProbability
    ),
  };
}

export {
  analyzeRecoveryRisk,
  calculateRecoveryScore,
  calculateCustomerReliability,
};