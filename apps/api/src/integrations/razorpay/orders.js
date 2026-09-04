import { razorpay } from "./client.js";

async function createRazorpayOrder({
  amount,
  currency = "INR",
  receipt,
  notes = {},
}) {
  if (!amount || Number(amount) <= 0) {
    throw new Error(
      "Order amount must be greater than zero."
    );
  }

  const amountInPaise = Math.round(
    Number(amount) * 100
  );

  const order =
    await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

  return order;
}

async function fetchRazorpayOrder(
  orderId
) {
  if (!orderId) {
    throw new Error(
      "Razorpay order ID is required."
    );
  }

  return razorpay.orders.fetch(orderId);
}

export {
  createRazorpayOrder,
  fetchRazorpayOrder,
};