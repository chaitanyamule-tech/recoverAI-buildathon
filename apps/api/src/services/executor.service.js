import prisma from "../lib/prisma.js";

function deterministicSuccess(externalId) {
  let hash = 0;

  for (let i = 0; i < externalId.length; i++) {
    hash =
      (hash * 31 +
        externalId.charCodeAt(i)) %
      100000;
  }

  return hash % 100 < 70;
}

async function executeRetryPayment({
  recoveryCase,
  transaction,
  action,
  recoveryProbability,
}) {
  const lastAttempt =
  await prisma.paymentAttempt.findFirst({
    where: {
      transactionId: transaction.id,
    },
    orderBy: {
      attemptNumber: "desc",
    },
  });


const nextAttempt =
  lastAttempt
    ? lastAttempt.attemptNumber + 1
    : 1;

const attemptType =
  nextAttempt === 1
    ? "INITIAL"
    : "RETRY";

  const succeeded =
    deterministicSuccess(
      `${transaction.externalId}:retry:${nextAttempt}`
    );

//   const attempt =
//     await prisma.paymentAttempt.create({
//       data: {
//         transactionId:
//           transaction.id,

//         attemptNumber:
//           nextAttempt,

//         status: succeeded
//           ? "CAPTURED"
//           : "FAILED",

//         failureReason: succeeded
//           ? null
//           : "SIMULATED_RECOVERY_FAILURE",

//         paymentMethod:
//           transaction.paymentMethod,

//         externalId:
//           `${transaction.externalId}_attempt_${nextAttempt}`,
//       },
//     });

const attempt =
  await prisma.paymentAttempt.create({
    data: {
      transactionId:
        transaction.id,

      attemptNumber:
        nextAttempt,

      attemptType,

      status: succeeded
        ? "CAPTURED"
        : "FAILED",

      failureReason: succeeded
        ? null
        : "SIMULATED_RECOVERY_FAILURE",

      paymentMethod:
        transaction.paymentMethod,

      externalId:
        `${transaction.externalId}_attempt_${nextAttempt}`,
    },
  });

  if (succeeded) {
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
        recoveredAmount:
          transaction.amount,
      },
    });

    await prisma.recoveryAction.update({
      where: {
        id: action.id,
      },

      data: {
        status: "SUCCESS",
        executedAt: new Date(),

        result: {
          success: true,
          recoveredAmount:
            Number(
              transaction.amount
            ),
          simulatedProbability:
            recoveryProbability,
          attemptId: attempt.id,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        merchantId:
          transaction.merchantId,

        recoveryCaseId:
          recoveryCase.id,

        eventType:
          "RECOVERY_SUCCEEDED",

        actor: "SYSTEM",

        action:
          "RETRY_PAYMENT",

        status: "SUCCESS",

        metadata: {
          amountRecovered:
            Number(
              transaction.amount
            ),
          attemptNumber:
            nextAttempt,
          attemptId: attempt.id,
        },
      },
    });

    return {
      success: true,
      action:
        "RETRY_PAYMENT",
      recoveredAmount:
        Number(
          transaction.amount
        ),
      attemptNumber:
        nextAttempt,
    };
  }

  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "FAILED",
      executedAt: new Date(),

      result: {
        success: false,
        recoveredAmount: 0,
        simulatedProbability:
          recoveryProbability,
        attemptId: attempt.id,
      },
    },
  });

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "FAILED",
      stopReason:
        "Recovery attempt failed.",
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId:
        transaction.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_FAILED",

      actor: "SYSTEM",

      action:
        "RETRY_PAYMENT",

      status: "FAILED",

      metadata: {
        amount:
          Number(
            transaction.amount
          ),
        attemptNumber:
          nextAttempt,
        attemptId: attempt.id,
      },
    },
  });

  return {
    success: false,
    action:
      "RETRY_PAYMENT",
    recoveredAmount: 0,
    attemptNumber:
      nextAttempt,
  };
}

async function executeReminder({
  recoveryCase,
  transaction,
  action,
}) {
  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "SUCCESS",
      executedAt: new Date(),

      result: {
        success: true,
        channel: "SIMULATED_NOTIFICATION",
        message:
          "Recovery reminder created.",
      },
    },
  });

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "EXECUTING",
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId:
        transaction.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_REMINDER_SENT",

      actor: "SYSTEM",

      action:
        "SEND_REMINDER",

      status: "SUCCESS",

      metadata: {
        simulated: true,
      },
    },
  });

  return {
    success: true,
    action:
      "SEND_REMINDER",
    recoveredAmount: 0,
  };
}

async function executeEscalation({
  recoveryCase,
  transaction,
  action,
  reason,
}) {
  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "SUCCESS",
      executedAt: new Date(),

      result: {
        escalated: true,
        reason,
      },
    },
  });

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "ESCALATED",
      escalationReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId:
        transaction.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_ESCALATED",

      actor: "SYSTEM",

      action:
        "ESCALATE",

      status: "SUCCESS",

      metadata: {
        reason,
      },
    },
  });

  return {
    success: true,
    action: "ESCALATE",
    recoveredAmount: 0,
  };
}

async function executeStop({
  recoveryCase,
  transaction,
  action,
  reason,
}) {
  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      status: "SUCCESS",
      executedAt: new Date(),

      result: {
        stopped: true,
        reason,
      },
    },
  });

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "STOPPED",
      stopReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId:
        transaction.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RECOVERY_STOPPED",

      actor: "SYSTEM",

      action: "STOP",

      status: "SUCCESS",

      metadata: {
        reason,
      },
    },
  });

  return {
    success: true,
    action: "STOP",
    recoveredAmount: 0,
  };
}

async function executeRecoveryAction({
  recoveryCaseId,
}) {
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
      "No recovery action found."
    );
  }

  if (action.status !== "APPROVED") {
    throw new Error(
      "Recovery action is not approved for execution."
    );
  }

  await prisma.recoveryCase.update({
    where: {
      id: recoveryCase.id,
    },

    data: {
      status: "EXECUTING",
    },
  });

  if (
    action.actionType ===
    "RETRY_PAYMENT"
  ) {
    return executeRetryPayment({
      recoveryCase,
      transaction:
        recoveryCase.transaction,
      action,
      recoveryProbability:
        recoveryCase.recoveryProbability,
    });
  }

  if (
    action.actionType ===
    "SEND_REMINDER"
  ) {
    return executeReminder({
      recoveryCase,
      transaction:
        recoveryCase.transaction,
      action,
    });
  }

  if (
    action.actionType ===
    "ESCALATE"
  ) {
    return executeEscalation({
      recoveryCase,
      transaction:
        recoveryCase.transaction,
      action,
      reason:
        recoveryCase.escalationReason ||
        "Human review required.",
    });
  }

  if (
    action.actionType ===
    "STOP"
  ) {
    return executeStop({
      recoveryCase,
      transaction:
        recoveryCase.transaction,
      action,
      reason:
        recoveryCase.stopReason ||
        "Automated recovery stopped.",
    });
  }

  throw new Error(
    `Unsupported execution action: ${action.actionType}`
  );
}

export {
  executeRecoveryAction,
};