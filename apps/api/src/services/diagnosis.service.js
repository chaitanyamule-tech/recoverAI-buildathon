const DIAGNOSIS_TYPES = {
  TRANSIENT_NETWORK_FAILURE:
    "TRANSIENT_NETWORK_FAILURE",

  PAYMENT_METHOD_DECLINE:
    "PAYMENT_METHOD_DECLINE",

  BANK_ERROR:
    "BANK_ERROR",

  INSUFFICIENT_FUNDS:
    "INSUFFICIENT_FUNDS",

  CHECKOUT_ABANDONMENT:
    "CHECKOUT_ABANDONMENT",

  REPEATED_FAILURE:
    "REPEATED_FAILURE",

  HIGH_VALUE_RECOVERY_CASE:
    "HIGH_VALUE_RECOVERY_CASE",

  UNKNOWN_FAILURE:
    "UNKNOWN_FAILURE",

  PAYMENT_METHOD_DEGRADATION:
    "PAYMENT_METHOD_DEGRADATION",
};

function diagnoseTransaction({
  amount,
  paymentMethod,
  failureReason,
  attemptNumber = 1,
}) {
  const numericAmount = Number(amount);

  if (!failureReason) {
    return {
      category: null,
      confidence: 1,
      severity: "NONE",
      explanation: "No failure reason present.",
      suggestedAction: null,
      evidence: [],
    };
  }

  if (failureReason === "CHECKOUT_ABANDONED") {
    return {
      category:
        DIAGNOSIS_TYPES.CHECKOUT_ABANDONMENT,
      confidence: 0.99,
      severity: "MEDIUM",
      explanation:
        "Customer initiated checkout but did not complete payment.",
      suggestedAction: "SEND_REMINDER",
      evidence: [
        "failureReason = CHECKOUT_ABANDONED",
      ],
    };
  }

  if (attemptNumber >= 3) {
    return {
      category:
        DIAGNOSIS_TYPES.REPEATED_FAILURE,
      confidence: 0.97,
      severity: "HIGH",
      explanation:
        "Multiple payment attempts have already failed.",
      suggestedAction: "STOP",
      evidence: [
        `attemptNumber = ${attemptNumber}`,
      ],
    };
  }

  if (numericAmount >= 25000) {
    return {
      category:
        DIAGNOSIS_TYPES.HIGH_VALUE_RECOVERY_CASE,
      confidence: 0.98,
      severity: "HIGH",
      explanation:
        "High-value transaction requires cautious recovery handling.",
      suggestedAction: "ESCALATE",
      evidence: [
        `amount = ${numericAmount}`,
        "amount >= 25000",
      ],
    };
  }

  switch (failureReason) {
    case "NETWORK_TIMEOUT":
      return {
        category:
          DIAGNOSIS_TYPES.TRANSIENT_NETWORK_FAILURE,
        confidence: 0.91,
        severity: "MEDIUM",
        explanation:
          "The payment failed because of a likely transient network problem.",
        suggestedAction:
          attemptNumber === 1
            ? "RETRY_PAYMENT"
            : "STOP",
        evidence: [
          "failureReason = NETWORK_TIMEOUT",
          `attemptNumber = ${attemptNumber}`,
        ],
      };

    case "UPI_DECLINED":
      return {
        category:
          DIAGNOSIS_TYPES.PAYMENT_METHOD_DECLINE,
        confidence: 0.88,
        severity: "MEDIUM",
        explanation:
          "The UPI payment was declined.",
        suggestedAction:
          attemptNumber === 1
            ? "OFFER_ALTERNATIVE_METHOD"
            : "STOP",
        evidence: [
          "failureReason = UPI_DECLINED",
          `paymentMethod = ${paymentMethod}`,
        ],
      };

    case "BANK_ERROR":
      return {
        category:
          DIAGNOSIS_TYPES.BANK_ERROR,
        confidence: 0.86,
        severity: "MEDIUM",
        explanation:
          "The payment provider returned a bank-side error.",
        suggestedAction:
          attemptNumber === 1
            ? "RETRY_PAYMENT"
            : "STOP",
        evidence: [
          "failureReason = BANK_ERROR",
          `paymentMethod = ${paymentMethod}`,
        ],
      };

    case "INSUFFICIENT_FUNDS":
      return {
        category:
          DIAGNOSIS_TYPES.INSUFFICIENT_FUNDS,
        confidence: 0.95,
        severity: "HIGH",
        explanation:
          "The payment could not be completed because sufficient funds were unavailable.",
        suggestedAction: "SEND_REMINDER",
        evidence: [
          "failureReason = INSUFFICIENT_FUNDS",
        ],
      };

    default:
      return {
        category:
          DIAGNOSIS_TYPES.UNKNOWN_FAILURE,
        confidence: 0.45,
        severity: "LOW",
        explanation:
          "The payment failed for an unknown or unsupported reason.",
        suggestedAction: "ESCALATE",
        evidence: [
          `failureReason = ${failureReason}`,
        ],
      };
  }
}

function detectPaymentMethodDegradation({
  baselineFailureRate,
  currentFailureRate,
  minimumCurrentSamples = 20,
}) {
  const baseline = Number(
    baselineFailureRate
  );

  const current = Number(
    currentFailureRate
  );

  if (
    !Number.isFinite(baseline) ||
    !Number.isFinite(current)
  ) {
    throw new Error(
      "Baseline and current failure rates must be numeric."
    );
  }

  if (
    baseline <= 0 ||
    current < 0 ||
    current > 1
  ) {
    throw new Error(
      "Invalid failure rate values."
    );
  }

  const absoluteIncrease =
    current - baseline;

  const relativeIncrease =
    absoluteIncrease / baseline;

  const degraded =
    current >= baseline * 2 &&
    current - baseline >= 0.05;

  if (!degraded) {
    return {
      detected: false,
      category: null,
      confidence: 0,
      explanation:
        "No significant payment-method degradation detected.",
      evidence: {
        baselineFailureRate: baseline,
        currentFailureRate: current,
        absoluteIncrease,
        relativeIncrease,
        minimumCurrentSamples,
      },
    };
  }

  const confidence = Math.min(
    0.99,
    0.70 +
      Math.min(relativeIncrease, 1) *
        0.20
  );

  return {
    detected: true,
    category:
      DIAGNOSIS_TYPES.PAYMENT_METHOD_DEGRADATION,
    confidence: Number(
      confidence.toFixed(3)
    ),
    severity:
      relativeIncrease >= 3
        ? "CRITICAL"
        : "HIGH",

    explanation:
      "Payment failure rate is significantly above the recent baseline.",

    evidence: {
      baselineFailureRate: baseline,
      currentFailureRate: current,
      absoluteIncrease: Number(
        absoluteIncrease.toFixed(4)
      ),
      relativeIncrease: Number(
        relativeIncrease.toFixed(4)
      ),
      minimumCurrentSamples,
    },
  };
}

export {
  DIAGNOSIS_TYPES,
  diagnoseTransaction,
  detectPaymentMethodDegradation,
};