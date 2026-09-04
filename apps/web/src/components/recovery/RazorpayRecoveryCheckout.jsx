"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function RazorpayRecoveryCheckout({
  recoveryCaseId,
  customer,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startRecovery() {
    try {
      setLoading(true);
      setError("");

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Razorpay Checkout failed to load."
        );
      }

      const response = await fetch(
        `${API_URL}/api/recovery/${recoveryCaseId}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to create recovery checkout."
        );
      }

      const order = result.data;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "RecoverAI",
        description:
          "RecoverAI payment recovery",
        order_id: order.orderId,

        prefill: {
          name: customer?.name || "",
          email: customer?.email || "",
          contact: customer?.phone || "",
        },

        notes: {
          recoveryCaseId:
            order.recoveryCaseId,
          transactionId:
            order.transactionId,
        },

        handler:
  async function (paymentResponse) {
    try {
      console.log(
        "✅ Razorpay Checkout success:",
        paymentResponse
      );

      const verifyResponse =
        await fetch(
          `${API_URL}/api/recovery/${recoveryCaseId}/verify`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              razorpay_payment_id:
                paymentResponse.razorpay_payment_id,

              razorpay_order_id:
                paymentResponse.razorpay_order_id,

              razorpay_signature:
                paymentResponse.razorpay_signature,
            }),
          }
        );

      const verifyResult =
        await verifyResponse.json();

      if (
        !verifyResponse.ok ||
        !verifyResult.success
      ) {
        throw new Error(
          verifyResult.error ||
            "Payment verification failed."
        );
      }

      console.log(
        "✅ Recovery verified:",
        verifyResult.data
      );

      if (onSuccess) {
        await onSuccess(
          verifyResult.data
        );
      }

      setLoading(false);
    } catch (error) {
      console.error(
        "❌ Recovery verification failed:",
        error
      );

      setError(
        error.message ||
          "Payment verification failed."
      );

      setLoading(false);
    }
  },
      };

      const checkout =
        new window.Razorpay(options);

      checkout.on(
        "payment.failed",
        function (response) {
          console.error(
            "❌ Razorpay payment failed:",
            response.error
          );

          setError(
            response.error?.description ||
              "Payment failed."
          );

          setLoading(false);
        }
      );

      checkout.open();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to start checkout."
      );

      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
  type="button"
  onClick={startRecovery}
  disabled={loading}
  className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {loading
    ? "Opening Razorpay..."
    : "Recover Payment"}
</button>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}