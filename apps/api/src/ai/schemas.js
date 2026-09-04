import { z } from "zod";

const RECOVERY_ACTIONS = [
  "RETRY_PAYMENT",
  "SEND_REMINDER",
  "OFFER_ALTERNATIVE_METHOD",
  "WAIT",
  "ESCALATE",
  "STOP",
];

const recoveryDecisionSchema = z.object({
  action: z.enum(RECOVERY_ACTIONS),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  evidence: z
    .array(z.string())
    .min(1)
    .max(8),
  expectedRecovery: z.number().min(0),
});

function validateAgentDecision(
  decision
) {
  return recoveryDecisionSchema.parse(
    decision
  );
}

export {
  RECOVERY_ACTIONS,
  recoveryDecisionSchema,
  validateAgentDecision,
};