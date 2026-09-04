import crypto from "crypto";

import { razorpay } from "./client.js";

async function fetchRazorpayPayment(
  paymentId
) {
  if (!paymentId) {
    throw new Error(
      "Razorpay payment ID is required."
    );
  }

  return razorpay.payments.fetch(
    paymentId
  );
}

async function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}) {
  if (
    !orderId ||
    !paymentId ||
    !signature
  ) {
    throw new Error(
      "Order ID, payment ID and signature are required."
    );
  }

  const secret =
    process.env.RAZORPAY_KEY_SECRET;

  const generatedSignature =
    crypto
      .createHmac("sha256", secret)
      .update(
        `${orderId}|${paymentId}`
      )
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
}

async function capturePayment({
  paymentId,
  amount,
  currency = "INR",
}) {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  const amountInPaise = Math.round(
    Number(amount) * 100
  );

  return razorpay.payments.capture(
    paymentId,
    amountInPaise,
    currency
  );
}

export {
  fetchRazorpayPayment,
  verifyPaymentSignature,
  capturePayment,
};