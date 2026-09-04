import "dotenv/config";

import {
  createRazorpayOrder,
} from "./orders.js";

async function main() {
  console.log(
    "🔌 Testing Razorpay Test Mode..."
  );

  const order =
    await createRazorpayOrder({
      amount: 100,
      currency: "INR",
      receipt:
        `recoverai_test_${Date.now()}`,
      notes: {
        source: "RecoverAI",
        environment: "test",
      },
    });

  console.log("\n✅ Razorpay order created:");

  console.log({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    receipt: order.receipt,
  });
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Razorpay test failed:"
    );

    console.error(
      error?.error?.description ||
        error?.message ||
        error
    );

    process.exit(1);
  });