import crypto from "crypto";

function verifyWebhookSignature(
  rawBody,
  signature
) {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured."
    );
  }

  if (!signature) {
    return false;
  }

  const expected =
    crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export {
  verifyWebhookSignature,
};