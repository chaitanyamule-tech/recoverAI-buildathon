import { runEvaluation } from "../services/evaluation.service.js";

export function getEvaluation(req, res, next) {
  try {
    const result = runEvaluation();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export function getEvaluationSummary(req, res, next) {
  try {
    const result = runEvaluation();

    res.json({
      success: true,
      data: {
        transactionsEvaluated: result.transactionsEvaluated,

        totalRevenue: result.totalRevenue,
        revenueAtRisk: result.revenueAtRisk,

        baselineRecovered:
          result.baseline.recoveredAmount,

        recoverAIRecovered:
          result.recoverAI.recoveredAmount,

        additionalRecovered:
          result.comparison.additionalRecovered,

        recoveryLiftPercent:
          result.comparison.recoveryLiftPercent,

        baselineRecoveryRate:
          result.baseline.recoveryRate,

        recoverAIRecoveryRate:
          result.recoverAI.recoveryRate,

        baselineSuccessfulRecoveries:
          result.baseline.successfulRecoveries,

        recoverAISuccessfulRecoveries:
          result.recoverAI.successfulRecoveries,

        baselineCorrectDecisions:
          result.baseline.correctActions,

        recoverAICorrectDecisions:
          result.recoverAI.correctActions,

        baselineUnnecessaryInterventions:
          result.baseline.unnecessaryInterventions,

        recoverAIUnnecessaryInterventions:
          result.recoverAI.unnecessaryInterventions,

        baselineIncorrectInterventions:
          result.baseline.incorrectInterventions,

        recoverAIIncorrectInterventions:
          result.recoverAI.incorrectInterventions,

        recoverAIEscalations:
          result.recoverAI.escalations,

        recoverAIStopped:
          result.recoverAI.stopped,

        decisionBreakdown:
          result.decisionBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}