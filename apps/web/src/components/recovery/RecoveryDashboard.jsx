"use client";

import { useEffect, useState } from "react";

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

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
}

function MetricCard({
  label,
  value,
  description,
  highlight = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          highlight
            ? "text-emerald-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-2 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
}) {
  const percentage =
    max > 0
      ? Math.min((value / max) * 100, 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          {label}
        </span>

        <span className="text-slate-500">
          {formatCurrency(value)}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function RecoveryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvaluation() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/evaluation/summary`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Evaluation API returned ${response.status}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || "Failed to load evaluation"
        );
      }

      setData(result.data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load evaluation data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvaluation();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          <p className="mt-4 text-sm text-slate-500">
            Loading recovery intelligence...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-700">
          Unable to load evaluation
        </h2>

        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>

        <button
          onClick={loadEvaluation}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const decisionEntries = Object.entries(
    data.decisionBreakdown?.recoverAI || {}
  );

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Revenue Recovery Intelligence
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
            RecoverAI Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Measure how intelligently RecoverAI identifies,
            prioritizes and recovers revenue at risk.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Dataset:{" "}
          <span className="font-semibold text-slate-900">
            v1
          </span>{" "}
          ·{" "}
          {formatNumber(data.transactionsEvaluated)}{" "}
          transactions
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue at Risk"
          value={formatCurrency(data.revenueAtRisk)}
          description="Revenue associated with recoverable transactions"
        />

        <MetricCard
          label="RecoverAI Recovered"
          value={formatCurrency(data.recoverAIRecovered)}
          description={`${data.recoverAIRecoveryRate.toFixed(2)}% recovery rate`}
          highlight
        />

        <MetricCard
          label="Additional Revenue"
          value={formatCurrency(data.additionalRecovered)}
          description="Additional revenue vs baseline"
          highlight
        />

        <MetricCard
          label="Recovery Lift"
          value={`+${data.recoveryLiftPercent.toFixed(2)}%`}
          description="Relative improvement over baseline"
          highlight
        />
      </div>

      {/* Comparison */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Baseline vs RecoverAI
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Same 10,000-transaction benchmark.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <ProgressBar
            label="Baseline Recovery"
            value={data.baselineRecovered}
            max={data.revenueAtRisk}
          />

          <ProgressBar
            label="RecoverAI Recovery"
            value={data.recoverAIRecovered}
            max={data.revenueAtRisk}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Baseline
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(data.baselineRecovered)}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {data.baselineRecoveryRate.toFixed(2)}% recovery rate
            </p>

            <p className="mt-4 text-sm text-slate-600">
              {formatNumber(
                data.baselineSuccessfulRecoveries
              )}{" "}
              successful recoveries
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">
              RecoverAI
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {formatCurrency(data.recoverAIRecovered)}
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              {data.recoverAIRecoveryRate.toFixed(2)}% recovery rate
            </p>

            <p className="mt-4 text-sm text-emerald-700">
              {formatNumber(
                data.recoverAISuccessfulRecoveries
              )}{" "}
              successful recoveries
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">
            Additional revenue recovered
          </p>

          <p className="mt-1 text-3xl font-bold text-emerald-800">
            +{formatCurrency(data.additionalRecovered)}
          </p>

          <p className="mt-2 text-sm text-emerald-700">
            RecoverAI delivered a{" "}
            <strong>
              {data.recoveryLiftPercent.toFixed(2)}%
            </strong>{" "}
            recovery lift over the baseline.
          </p>
        </div>
      </section>

      {/* Decisions + Safety */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Decisions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            RecoverAI Decision Breakdown
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            How the recovery agent handled the benchmark.
          </p>

          <div className="mt-6 space-y-3">
            {decisionEntries.map(
              ([decision, count]) => {
                const percentage =
                  data.transactionsEvaluated > 0
                    ? (
                        (count /
                          data.transactionsEvaluated) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={decision}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {decision.replaceAll(
                          "_",
                          " "
                        )}
                      </p>

                      <p className="text-xs text-slate-500">
                        {percentage}% of transactions
                      </p>
                    </div>

                    <span className="text-lg font-bold text-slate-900">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* Safety */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Safety & Control
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Decision quality and bounded recovery behavior.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Correct decisions
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatNumber(
                  data.recoverAICorrectDecisions
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Escalations
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatNumber(
                  data.recoverAIEscalations
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Stopped
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatNumber(data.recoverAIStopped)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Unnecessary
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatNumber(
                  data.recoverAIUnnecessaryInterventions
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Incorrect interventions
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatNumber(
                  data.recoverAIIncorrectInterventions
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-800">
              Bounded automation
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              RecoverAI separates AI recommendations from
              deterministic policy enforcement and execution.
            </p>
          </div>
        </section>
      </div>

      {/* Benchmark note */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-700">
          Benchmark note
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Results are generated from RecoverAI's synthetic
          evaluation dataset and hidden ground truth. They
          demonstrate simulated recovery impact and are not
          real customer payment results.
        </p>
      </section>

    </div>
  );
}