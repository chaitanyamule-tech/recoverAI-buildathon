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

    const script =
      document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () =>
      resolve(true);

    script.onerror = () =>
      resolve(false);

    document.body.appendChild(script);
  });
}

export default function RazorpayRecoveryCheckout({
  recoveryCaseId,
  customer,
  onSuccess,
}) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function startRecovery() {
    try {
      setLoading(true);
      setError("");

      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Razorpay Checkout failed to load."
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/recovery/${recoveryCaseId}/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Unable to create recovery checkout."
        );
      }

      const order = result.data;

      const options = {
        key: order.keyId,

        amount: order.amount,

        currency:
          order.currency,

        name: "RecoverAI",

        description:
          "RecoverAI payment recovery",

        order_id:
          order.orderId,

        prefill: {
          name:
            customer?.name || "",

          email:
            customer?.email || "",

          contact:
            customer?.phone || "",
        },

        notes: {
          recoveryCaseId:
            order.recoveryCaseId,

          transactionId:
            order.transactionId,
        },

        handler:
          async function (
            paymentResponse
          ) {
            console.log(
              "✅ Razorpay Checkout success:",
              paymentResponse
            );

            if (onSuccess) {
              await onSuccess(
                paymentResponse
              );
            }

            setLoading(false);
          },

        modal: {
          ondismiss() {
            setLoading(false);
          },
        },
      };

      const checkout =
        new window.Razorpay(
          options
        );

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
        className="rounded-lg px-5 py-3 font-semibold"
      >
        {loading
          ? "Opening Checkout..."
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