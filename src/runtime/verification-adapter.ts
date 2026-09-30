import { z } from 'zod';
import { FormalProblem } from '../verification/formal-problem';
import { 
  EvaluatorDecisionSchema, 
  EvaluatorDecision, 
  evaluateFormalProblem 
} from '../verification/verification-evaluator';
import { CertificationStatusEnum } from '../verification/certification-state';

export const RuntimeVerificationReportSchema = z.object({
  isPermitted: z.boolean(),
  decision: EvaluatorDecisionSchema,
  haltReason: z.string().min(1).optional()
});

export type RuntimeVerificationReport = z.infer<typeof RuntimeVerificationReportSchema>;

export const validateRuntimeVerificationReport = (input: unknown) => RuntimeVerificationReportSchema.safeParse(input);

export const evaluateRuntimeIntent = (
  problem: FormalProblem,
  timestampISO: string,
  runtimeComponentId: string
): RuntimeVerificationReport => {
  const decision = evaluateFormalProblem(problem, timestampISO, runtimeComponentId);

  const isPermitted = decision.status === CertificationStatusEnum.CONDITIONALLY_SUPPORTED;

  if (!isPermitted) {
    const haltReason = decision.decisionBasis || 'Execution halted by Verification Evaluator due to unmet conditions or blocked status.';
    return {
      isPermitted: false,
      decision,
      haltReason
    };
  }

  return {
    isPermitted: true,
    decision
  };
};
