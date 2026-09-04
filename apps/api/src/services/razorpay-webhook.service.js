import prisma from "../lib/prisma.js";

async function processRazorpayWebhook({
  eventId,
  eventType,
  payload,
}) {
  if (!eventId) {
    throw new Error(
      "Razorpay webhook event ID is required."
    );
  }

  /*
   * Idempotency:
   * Never process the same Razorpay event twice.
   */
  const existing =
    await prisma.webhookEvent.findUnique({
      where: {
        eventId,
      },
    });

  if (existing) {
    return {
      processed: false,
      duplicate: true,
      message:
        "Webhook already processed.",
    };
  }

  /*
   * Extract merchant context from
   * the Razorpay payload.
   */
  const payment =
    payload?.payload?.payment?.entity;

  const order =
    payload?.payload?.order?.entity;

  const orderId =
    payment?.order_id ||
    order?.id;

  let recoveryCase = null;

  if (orderId) {
    recoveryCase =
      await prisma.recoveryCase.findFirst({
        where: {
          actions: {
            some: {
              result: {
                path: [
                  "razorpayOrderId",
                ],
                equals: orderId,
              },
            },
          },
        },
        include: {
          actions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          transaction: true,
        },
      });
  }

  /*
   * We need merchant ID for WebhookEvent.
   */
  let merchantId;

  if (recoveryCase) {
    merchantId =
      recoveryCase.merchantId;
  } else {
    const merchant =
      await prisma.merchant.findUnique({
        where: {
          email: "demo@recoverai.dev",
        },
      });

    if (!merchant) {
      throw new Error(
        "Merchant not found."
      );
    }

    merchantId =
      merchant.id;
  }

  /*
   * Record webhook before processing.
   */
  const webhook =
    await prisma.webhookEvent.create({
      data: {
        merchantId,
        eventId,
        eventType,
        payload,
        status: "RECEIVED",
      },
    });

  /*
   * Only payment success is a recovery success.
   */
  if (
    eventType !== "payment.captured" &&
    eventType !== "order.paid"
  ) {
    await prisma.webhookEvent.update({
      where: {
        id: webhook.id,
      },
      data: {
        status: "IGNORED",
        processedAt: new Date(),
      },
    });

    return {
      processed: true,
      recoveryUpdated: false,
      message:
        "Webhook received but not relevant to recovery.",
    };
  }

  if (!recoveryCase) {
    await prisma.webhookEvent.update({
      where: {
        id: webhook.id,
      },
      data: {
        status: "IGNORED",
        processedAt: new Date(),
      },
    });

    return {
      processed: true,
      recoveryUpdated: false,
      message:
        "No RecoverAI recovery case matched.",
    };
  }

  /*
   * If verification already completed,
   * webhook should not duplicate the recovery.
   */
  if (
    recoveryCase.status ===
    "RECOVERED"
  ) {
    await prisma.webhookEvent.update({
      where: {
        id: webhook.id,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return {
      processed: true,
      recoveryUpdated: false,
      alreadyRecovered: true,
    };
  }

  const paymentStatus =
    payment?.status;

  if (
    paymentStatus !== "captured" &&
    eventType !== "order.paid"
  ) {
    await prisma.webhookEvent.update({
      where: {
        id: webhook.id,
      },
      data: {
        status: "IGNORED",
        processedAt: new Date(),
      },
    });

    return {
      processed: true,
      recoveryUpdated: false,
    };
  }

  const transaction =
    recoveryCase.transaction;

  const amount =
    Number(transaction.amount);

  /*
   * Create retry attempt.
   */
  const lastAttempt =
    await prisma.paymentAttempt.findFirst({
      where: {
        transactionId:
          transaction.id,
      },
      orderBy: {
        attemptNumber: "desc",
      },
    });

  const attemptNumber =
    lastAttempt
      ? lastAttempt.attemptNumber + 1
      : 2;

  const attempt =
    await prisma.paymentAttempt.create({
      data: {
        transactionId:
          transaction.id,

        attemptNumber,

        attemptType: "RETRY",

        status: "CAPTURED",

        failureReason: null,

        paymentMethod:
          transaction.paymentMethod,

        externalId:
          payment?.id ||
          null,
      },
    });

  await prisma.transaction.update({
    where: {
      id: transaction.id,
    },

    data: {
      status: "CAPTURED",

      failureReason: null,
    },
  });

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "RECOVERED",

      recoveredAmount: amount,
    },
  });

  const action =
    recoveryCase.actions[0];

  if (action) {
    await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },

      data: {
        status: "SUCCESS",

        executedAt: new Date(),

        result: {
          ...(action.result || {}),

          webhookVerified: true,

          webhookEventId:
            eventId,

          razorpayPaymentId:
            payment?.id || null,

          paymentAttemptId:
            attempt.id,

          recoveredAmount:
            amount,
        },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_WEBHOOK_VERIFIED",

      actor: "SYSTEM",

      action:
        "RETRY_PAYMENT",

      status: "SUCCESS",

      metadata: {
        eventId,

        eventType,

        razorpayPaymentId:
          payment?.id || null,

        razorpayOrderId:
          orderId,

        recoveredAmount:
          amount,

        paymentAttemptId:
          attempt.id,
      },
    },
  });

  await prisma.webhookEvent.update({
    where: {
      id: webhook.id,
    },

    data: {
      status: "PROCESSED",

      processedAt: new Date(),
    },
  });

  return {
    processed: true,

    recoveryUpdated: true,

    recoveryCaseId:
      recoveryCase.id,

    paymentAttemptId:
      attempt.id,

    recoveredAmount:
      amount,
  };
}

export {
  processRazorpayWebhook,
};

