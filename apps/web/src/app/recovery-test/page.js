"use client";

import { useState } from "react";

import RazorpayRecoveryCheckout from "../../components/recovery/RazorpayRecoveryCheckout";

import RecoveryNav from "../../components/recovery/RecoveryNav";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function RecoveryTestPage() {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(null);

  async function analyzePayment() {
    try {
      setLoading(true);
      setError("");
      setDemoData(null);
      setCompleted(null);

      const response = await fetch(
        `${API_URL}/api/recovery/demo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to analyze payment."
        );
      }

      setDemoData(result.data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to analyze payment."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRecoverySuccess(result) {
    console.log(
      "✅ Recovery completed:",
      result
    );

    setCompleted(result);
  }

  return (
      <>
	<RecoveryNav />
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Razorpay Test Mode
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            RecoverAI Live Recovery
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            Analyze a failed payment, understand why it is
            recoverable, apply policy controls, and execute a
            bounded recovery.
          </p>
        </div>

        {/* Analyze button */}
        {!demoData && !completed && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={analyzePayment}
              disabled={loading}
              className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Analyzing Failed Payment..."
                : "Analyze Failed Payment"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Recovery analysis failed
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={analyzePayment}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Analysis */}
        {demoData && !completed && (
          <div className="mt-10 space-y-6">

            {/* Transaction */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Failed Transaction
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {formatCurrency(
                      demoData.recoveryAction?.amount
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Transaction ID:{" "}
                    {demoData.recoveryCase?.transactionId}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Payment Status
                  </p>

                  <p className="mt-1 font-bold text-amber-800">
                    FAILED
                  </p>
                </div>
              </div>
            </section>

            {/* Risk */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                1. Risk Assessment
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Risk Score
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {demoData.risk.riskScore}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Recovery Probability
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {(
                      demoData.risk
                        .recoveryProbability * 100
                    ).toFixed(2)}
                    %
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Expected Recovery
                  </p>

                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    {formatCurrency(
                      demoData.risk.expectedRecovery
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Diagnosis */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                2. Diagnosis
              </h2>

              <div className="mt-5 rounded-xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {demoData.diagnosis.category.replaceAll(
                    "_",
                    " "
                  )}
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {demoData.diagnosis.explanation}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                    Confidence{" "}
                    {(
                      demoData.diagnosis.confidence *
                      100
                    ).toFixed(0)}
                    %
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                    Severity{" "}
                    {demoData.diagnosis.severity}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
                    Attempt{" "}
                    {demoData.recoveryAction?.attemptNumber}
                  </span>
                </div>
              </div>
            </section>

            {/* AI */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    3. AI Recovery Recommendation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Planning only — AI does not execute payment.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {demoData.aiDecision.model}
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Recommended Action
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {demoData.aiDecision.action.replaceAll(
                        "_",
                        " "
                      )}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-slate-500">
                      Confidence
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {(
                        demoData.aiDecision
                          .confidence * 100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-600">
                  {demoData.aiDecision.reasoning}
                </p>
              </div>
            </section>

            {/* Policy */}
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-xl font-bold text-emerald-900">
                4. Policy Decision
              </h2>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-emerald-700">
                    Final Action
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                    {demoData.policyDecision.finalAction.replaceAll(
                      "_",
                      " "
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-5 py-3 text-center ring-1 ring-emerald-200">
                  <p className="text-sm font-semibold text-emerald-700">
                    {demoData.policyDecision.allowed
                      ? "✓ APPROVED"
                      : "BLOCKED"}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-emerald-700">
                {demoData.policyDecision.reason}
              </p>
            </section>

            {/* Expected recovery + checkout */}
            {demoData.policyDecision.allowed && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Expected Recovery
                    </p>

                    <p className="mt-1 text-3xl font-bold text-slate-950">
                      {formatCurrency(
                        demoData.risk.expectedRecovery
                      )}
                    </p>
                  </div>

                  <RazorpayRecoveryCheckout
                    recoveryCaseId={
                      demoData.recoveryCase.id
                    }
                    customer={{
                      name: "Demo Customer",
                      email:
                        "demo@example.com",
                      phone:
                        "+919800000001",
                    }}
                    onSuccess={
                      handleRecoverySuccess
                    }
                  />
                </div>
              </section>
            )}
          </div>
        )}

        {/* Completed */}
        {completed && (
          <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white">
              ✓
            </div>

            <h2 className="mt-5 text-3xl font-bold text-emerald-900">
              Payment Recovered
            </h2>

            <p className="mt-2 text-emerald-700">
              RecoverAI successfully completed the recovery flow.
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-2xl bg-white p-6 text-left ring-1 ring-emerald-200">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  Recovered Amount
                </span>

                <span className="font-bold text-slate-900">
                  {formatCurrency(
                    completed.recoveredAmount
                  )}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4">
                <span className="text-slate-500">
                  Recovery Status
                </span>

                <span className="font-bold text-emerald-700">
                  RECOVERED
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompleted(null);
                setDemoData(null);
                setError("");
              }}
              className="mt-6 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Run Another Recovery
            </button>
          </section>
        )}

      </div>
    </main>
   </>
  );
}