import prisma from "../lib/prisma.js";

import {
  fetchRazorpayPayment,
  verifyPaymentSignature,
} from "../integrations/razorpay/payments.js";

async function verifyRecoveryPayment({
  recoveryCaseId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
}) {
  if (
    !razorpayPaymentId ||
    !razorpayOrderId ||
    !razorpaySignature
  ) {
    throw new Error(
      "Razorpay payment ID, order ID and signature are required."
    );
  }

  const recoveryCase =
    await prisma.recoveryCase.findUnique({
      where: {
        id: recoveryCaseId,
      },
      include: {
        transaction: true,
        actions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

  if (!recoveryCase) {
    throw new Error(
      "Recovery case not found."
    );
  }

  const action =
    recoveryCase.actions[0];

  if (!action) {
    throw new Error(
      "Recovery action not found."
    );
  }

  if (
    action.actionType !==
    "RETRY_PAYMENT"
  ) {
    throw new Error(
      "Recovery case is not a payment retry."
    );
  }

  const actionResult =
    action.result || {};

  const storedOrderId =
    actionResult.razorpayOrderId;

  if (!storedOrderId) {
    throw new Error(
      "No Razorpay recovery order is associated with this action."
    );
  }

  /*
   * IMPORTANT:
   * Never trust the order ID returned by the browser
   * for signature verification.
   *
   * Razorpay recommends using the order ID stored
   * on our server.
   */
  if (
    razorpayOrderId !== storedOrderId
  ) {
    throw new Error(
      "Razorpay order ID does not match the recovery order stored on the server."
    );
  }

  const signatureValid =
    await verifyPaymentSignature({
      orderId: storedOrderId,
      paymentId:
        razorpayPaymentId,
      signature:
        razorpaySignature,
    });

  if (!signatureValid) {
    await prisma.auditLog.create({
      data: {
        merchantId:
          recoveryCase.merchantId,

        recoveryCaseId:
          recoveryCase.id,

        eventType:
          "RAZORPAY_SIGNATURE_VERIFICATION_FAILED",

        actor: "SYSTEM",

        action:
          "VERIFY_PAYMENT",

        status: "FAILED",

        metadata: {
          razorpayPaymentId,
          razorpayOrderId,
        },
      },
    });

    throw new Error(
      "Invalid Razorpay payment signature."
    );
  }

  /*
   * Signature is valid.
   * Now fetch the payment from Razorpay.
   */
  const payment =
    await fetchRazorpayPayment(
      razorpayPaymentId
    );

  if (!payment) {
    throw new Error(
      "Razorpay payment not found."
    );
  }

  if (
    payment.order_id !==
    storedOrderId
  ) {
    throw new Error(
      "Razorpay payment does not belong to the recovery order."
    );
  }

  if (
    payment.status !==
    "captured"
  ) {
    throw new Error(
      `Payment is not captured. Current status: ${payment.status}`
    );
  }

  const expectedAmount =
    Math.round(
      Number(
        recoveryCase.transaction.amount
      ) * 100
    );

  if (
    Number(payment.amount) !==
    expectedAmount
  ) {
    throw new Error(
      "Payment amount does not match the recovery transaction amount."
    );
  }

  /*
   * Prevent duplicate recovery processing.
   */
  if (
    recoveryCase.status ===
    "RECOVERED"
  ) {
    return {
      success: true,
      alreadyProcessed: true,
      recoveredAmount:
        Number(
          recoveryCase.recoveredAmount
        ),
      paymentId:
        razorpayPaymentId,
      orderId:
        storedOrderId,
    };
  }

  /*
   * Determine the next PaymentAttempt number.
   */
  const lastAttempt =
  await prisma.paymentAttempt.findFirst({
    where: {
      transactionId:
        recoveryCase.transaction.id,
    },
    orderBy: {
      attemptNumber: "desc",
    },
  });

let nextAttempt;

if (!lastAttempt) {
  // The original failed payment was not recorded
  // in PaymentAttempt yet. Create it first.
  await prisma.paymentAttempt.create({
    data: {
      transactionId:
        recoveryCase.transaction.id,

      attemptNumber: 1,

      attemptType: "INITIAL",

      status:
        recoveryCase.transaction.status,

      failureReason:
        recoveryCase.transaction.failureReason,

      paymentMethod:
        recoveryCase.transaction
          .paymentMethod,

      externalId:
        recoveryCase.transaction
          .externalId,
    },
  });

  nextAttempt = 2;
} else {
  nextAttempt =
    lastAttempt.attemptNumber + 1;
}

  const attempt =
    await prisma.paymentAttempt.create({
      data: {
        transactionId:
          recoveryCase.transaction.id,

        attemptNumber:
          nextAttempt,

        attemptType: "RETRY",

        status:
          "CAPTURED",

        failureReason: null,

        paymentMethod:
          recoveryCase.transaction
            .paymentMethod,

        externalId:
          razorpayPaymentId,
      },
    });

  const recoveredAmount =
    Number(
      recoveryCase.transaction.amount
    );

  /*
   * Update transaction.
   */
  await prisma.transaction.update({
    where: {
      id:
        recoveryCase.transaction.id,
    },

    data: {
      status: "CAPTURED",
      failureReason: null,
    },
  });

  /*
   * Update RecoveryCase.
   */
  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "RECOVERED",
      recoveredAmount,
    },
  });

  /*
   * Update RecoveryAction.
   */
  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "SUCCESS",
      executedAt: new Date(),

      result: {
        ...actionResult,

        verified: true,

        razorpayPaymentId:
          razorpayPaymentId,

        razorpayOrderId:
          storedOrderId,

        recoveredAmount,

        paymentStatus:
          payment.status,

        paymentAttemptId:
          attempt.id,

        verifiedAt:
          new Date().toISOString(),
      },
    },
  });

  /*
   * Audit trail.
   */
  await prisma.auditLog.create({
    data: {
      merchantId:
        recoveryCase.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_PAYMENT_VERIFIED",

      actor: "SYSTEM",

      action:
        "RETRY_PAYMENT",

      status: "SUCCESS",

      metadata: {
        razorpayPaymentId,
        razorpayOrderId:
          storedOrderId,

        paymentStatus:
          payment.status,

        recoveredAmount,

        paymentAttemptId:
          attempt.id,
      },
    },
  });

  return {
    success: true,
    alreadyProcessed: false,

    paymentId:
      razorpayPaymentId,

    orderId:
      storedOrderId,

    paymentStatus:
      payment.status,

    recoveredAmount,

    attemptNumber:
      nextAttempt,

    recoveryCaseId:
      recoveryCase.id,
  };
}

export {
  verifyRecoveryPayment,
};