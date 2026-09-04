import {
  generateRecoveryDecision,
  model,
} from "./provider.js";

import {
  SYSTEM_PROMPT,
  buildRecoveryPrompt,
} from "./prompts.js";

import {
  validateAgentDecision,
} from "./schemas.js";

function buildFallbackDecision({
  transaction,
  diagnosis,
}) {
  let action = diagnosis.suggestedAction || "STOP";
  let reasoning =
    "Gemini was temporarily unavailable. RecoverAI used the deterministic diagnosis fallback.";

  /*
   * Keep the fallback conservative.
   * The policy engine still remains the final authority.
   */

  if (
    transaction.attemptNumber >= 3
  ) {
    action = "STOP";

    reasoning =
      "Gemini was unavailable and the transaction has reached the maximum retry boundary.";
  }

  return {
    action,
    confidence: 0.75,
    reasoning,
    evidence: [
      "Fallback decision generated from deterministic diagnosis.",
      "Policy validation remains mandatory before execution.",
    ],
    expectedRecovery: null,
    model: "DETERMINISTIC_FALLBACK",
  };
}

async function planRecovery({
  transaction,
  customer,
  risk,
  diagnosis,
  policy,
}) {
  const prompt = buildRecoveryPrompt({
    transaction,
    customer,
    risk,
    diagnosis,
    policy,
  });

  const fullPrompt = `${SYSTEM_PROMPT}

${prompt}`;

  let rawResponse;

  try {
    rawResponse =
      await generateRecoveryDecision(
        fullPrompt
      );
  } catch (error) {
    console.warn(
      "⚠️ Gemini unavailable. Using deterministic fallback.",
      error?.message || error
    );

    return buildFallbackDecision({
      transaction,
      diagnosis,
    });
  }

  let parsed;

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    console.warn(
      "⚠️ Gemini returned invalid JSON. Using deterministic fallback."
    );

    return buildFallbackDecision({
      transaction,
      diagnosis,
    });
  }

  try {
    const decision =
      validateAgentDecision(parsed);

    return {
      ...decision,
      model,
    };
  } catch (error) {
    console.warn(
      "⚠️ Gemini decision failed schema validation. Using deterministic fallback."
    );

    return buildFallbackDecision({
      transaction,
      diagnosis,
    });
  }
}

export {
  planRecovery,
};