// import prisma from "../lib/prisma.js";

// import {
//   createRazorpayOrder,
// } from "../integrations/razorpay/orders.js";

// async function createRecoveryCheckout(
//   recoveryCaseId
// ) {
//   const recoveryCase =
//     await prisma.recoveryCase.findUnique({
//       where: {
//         id: recoveryCaseId,
//       },
//       include: {
//         transaction: true,
//         actions: {
//           orderBy: {
//             createdAt: "desc",
//           },
//           take: 1,
//         },
//       },
//     });

//   if (!recoveryCase) {
//     throw new Error(
//       "Recovery case not found."
//     );
//   }

//   const action =
//     recoveryCase.actions[0];

//   if (!action) {
//     throw new Error(
//       "No recovery action exists."
//     );
//   }

//   if (
//     action.actionType !==
//     "RETRY_PAYMENT"
//   ) {
//     throw new Error(
//       "Recovery checkout is only available for RETRY_PAYMENT."
//     );
//   }

//   if (
//     action.status !==
//     "APPROVED"
//   ) {
//     throw new Error(
//       "Recovery action is not approved."
//     );
//   }

//   if (
//     recoveryCase.status !==
//       "APPROVED" &&
//     recoveryCase.status !==
//       "EXECUTING"
//   ) {
//     throw new Error(
//       `Recovery case cannot start checkout from status ${recoveryCase.status}.`
//     );
//   }

//   const transaction =
//     recoveryCase.transaction;

//   const receipt =
//     `recovery_${recoveryCase.id}`;

//   const order =
//     await createRazorpayOrder({
//       amount:
//         Number(transaction.amount),

//       currency:
//         transaction.currency,

//       receipt,

//       notes: {
//         recoveryCaseId:
//           recoveryCase.id,

//         transactionId:
//           transaction.id,

//         source:
//           "RecoverAI",

//         action:
//           "RETRY_PAYMENT",
//       },
//     });

//   await prisma.recoveryAction.update({
//     where: {
//       id: action.id,
//     },

//     data: {
//       result: {
//         ...(action.result || {}),
//         razorpayOrderId:
//           order.id,
//         checkoutCreatedAt:
//           new Date().toISOString(),
//       },
//     },
//   });

//   await prisma.auditLog.create({
//     data: {
//       merchantId:
//         recoveryCase.merchantId,

//       recoveryCaseId:
//         recoveryCase.id,

//       eventType:
//         "RAZORPAY_RECOVERY_ORDER_CREATED",

//       actor:
//         "SYSTEM",

//       action:
//         "RETRY_PAYMENT",

//       status:
//         "SUCCESS",

//       metadata: {
//         razorpayOrderId:
//           order.id,

//         amount:
//           Number(order.amount) /
//           100,

//         currency:
//           order.currency,
//       },
//     },
//   });

//   return {
//     orderId:
//       order.id,

//     amount:
//       Number(order.amount),

//     currency:
//       order.currency,

//     keyId:
//       process.env.RAZORPAY_KEY_ID,

//     recoveryCaseId:
//       recoveryCase.id,

//     transactionId:
//       transaction.id,
//   };
// }

// export {
//   createRecoveryCheckout,
// };

import prisma from "../lib/prisma.js";

import {
  createRazorpayOrder,
} from "../integrations/razorpay/orders.js";

async function createRecoveryCheckout(
  recoveryCaseId
) {
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

  if (
    action.actionType !==
    "RETRY_PAYMENT"
  ) {
    throw new Error(
      "This recovery case does not require a payment retry."
    );
  }

  if (
    action.status !==
    "APPROVED"
  ) {
    throw new Error(
      "Recovery action is not approved."
    );
  }

  if (
    recoveryCase.status !==
    "APPROVED"
  ) {
    throw new Error(
      `Recovery case is not ready for checkout. Current status: ${recoveryCase.status}`
    );
  }

  const transaction =
    recoveryCase.transaction;

  /*
   * Prevent accidental duplicate checkout
   * creation for the same recovery action.
   */
  const actionResult =
    action.result || {};

  if (
    actionResult.razorpayOrderId
  ) {
    throw new Error(
      "A Razorpay recovery order already exists for this action."
    );
  }

  const order =
    await createRazorpayOrder({
      amount:
        Number(transaction.amount),

      currency:
        transaction.currency,

      receipt:
        `recovery_${recoveryCase.id}`,

      notes: {
        source: "RecoverAI",
        recoveryCaseId:
          recoveryCase.id,
        transactionId:
          transaction.id,
        action:
          "RETRY_PAYMENT",
      },
    });

  await prisma.recoveryAction.update({
    where: {
      id: action.id,
    },

    data: {
      result: {
        ...actionResult,
        razorpayOrderId:
          order.id,
        checkoutCreatedAt:
          new Date().toISOString(),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      merchantId:
        recoveryCase.merchantId,

      recoveryCaseId:
        recoveryCase.id,

      eventType:
        "RAZORPAY_RECOVERY_ORDER_CREATED",

      actor: "SYSTEM",

      action:
        "RETRY_PAYMENT",

      status: "SUCCESS",

      metadata: {
        razorpayOrderId:
          order.id,

        amount:
          Number(order.amount) / 100,

        currency:
          order.currency,
      },
    },
  });

  return {
    orderId:
      order.id,

    amount:
      order.amount,

    currency:
      order.currency,

    keyId:
      process.env.RAZORPAY_KEY_ID,

    recoveryCaseId:
      recoveryCase.id,

    transactionId:
      transaction.id,
  };
}

export {
  createRecoveryCheckout,
};