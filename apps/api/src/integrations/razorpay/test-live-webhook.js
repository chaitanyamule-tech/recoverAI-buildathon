import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config({
  path: new URL("../../.env", import.meta.url),
});

import { prisma } from "../../lib/prisma.js";

const WEBHOOK_URL = "http://localhost:5000/api/webhooks/razorpay";

function signPayload(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

async function main() {
  console.log("\n🔔 RecoverAI Live Webhook Test\n");

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is missing from apps/api/.env"
    );
  }

  /*
   * Find an approved RecoveryCase that already has
   * a Razorpay recovery order.
   */
  const recoveryCases = await prisma.recoveryCase.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      transaction: true,
      actions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  let selectedCase = null;
  let selectedAction = null;
  let razorpayOrderId = null;

  for (const recoveryCase of recoveryCases) {
    for (const action of recoveryCase.actions) {
      const result = action.result;

      if (
        result &&
        typeof result === "object" &&
        !Array.isArray(result) &&
        result.razorpayOrderId
      ) {
        selectedCase = recoveryCase;
        selectedAction = action;
        razorpayOrderId = result.razorpayOrderId;
        break;
      }
    }

    if (selectedCase) break;
  }

  if (!selectedCase) {
    throw new Error(
      "No APPROVED recovery case with a Razorpay recovery order was found."
    );
  }

  const paymentId = `pay_WEBHOOKTEST_${Date.now()}`;

  const payloadObject = {
    entity: "event",
    account_id: "acc_test_recoverai",
    event: "payment.captured",
    contains: ["payment"],
    created_at: Math.floor(Date.now() / 1000),

    // Razorpay event id used for idempotency
    id: `evt_WEBHOOKTEST_${Date.now()}`,

    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: "payment",
          amount: Math.round(
            Number(selectedCase.transaction.amount) * 100
          ),
          currency: "INR",
          status: "captured",
          order_id: razorpayOrderId,
          method: "upi",
        },
      },
    },
  };

  const rawBody = JSON.stringify(payloadObject);

  const signature = signPayload(
    rawBody,
    process.env.RAZORPAY_WEBHOOK_SECRET
  );

  console.log("Recovery Case :", selectedCase.id);
  console.log("Action        :", selectedAction.id);
  console.log("Transaction   :", selectedCase.transaction.id);
  console.log("Amount        :", selectedCase.transaction.amount);
  console.log("Razorpay Order:", razorpayOrderId);
  console.log("Payment ID    :", paymentId);
  console.log("Event ID      :", payloadObject.id);

  console.log("\n📤 Sending payment.captured webhook...\n");

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": payloadObject.id,
    },
    body: rawBody,
  });

  const responseText = await response.text();

  console.log("HTTP Status:", response.status);
  console.log("Response:", responseText);

  if (!response.ok) {
    throw new Error("Webhook request failed.");
  }

  console.log("\n✅ First webhook delivered successfully.");

  /*
   * Send the SAME event again.
   * This checks idempotency.
   */

  console.log("\n🔁 Sending the SAME webhook again...\n");

  const secondResponse = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": payloadObject.id,
    },
    body: rawBody,
  });

  const secondResponseText = await secondResponse.text();

  console.log("HTTP Status:", secondResponse.status);
  console.log("Response:", secondResponseText);

  if (!secondResponse.ok) {
    throw new Error("Second webhook request failed.");
  }

  console.log("\n✅ Idempotency test completed.");

  /*
   * Inspect final database state.
   */

  const updatedCase = await prisma.recoveryCase.findUnique({
    where: {
      id: selectedCase.id,
    },
    include: {
      actions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  console.log("\n📊 Final Recovery Case State");
  console.log("--------------------------------");
  console.log("Case Status:", updatedCase?.status);

  const latestAction = updatedCase?.actions?.[0];

  if (latestAction) {
    console.log("Latest Action Status:", latestAction.status);
  }

  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      transactionId: selectedCase.transaction.id,
    },
    orderBy: {
      attemptNumber: "asc",
    },
  });

  console.log("\nPayment Attempts:");

  for (const attempt of attempts) {
    console.log(
      `#${attempt.attemptNumber}`,
      attempt.attemptType,
      attempt.status,
      attempt.paymentId || ""
    );
  }

  console.log("\n🎉 Webhook test finished successfully.");
}

main()
  .catch((error) => {
    console.error("\n❌ Webhook test failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });