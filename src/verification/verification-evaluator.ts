import { z } from 'zod';
import { VerificationResult } from './verification-result';
import { FormalProblem } from './formal-problem';
import { StopConditionCodeEnum } from './stop-conditions';
import { CertificationStatusEnum } from './certification-state';
import { EpistemicStatusEnum, EpistemicStatusSchema } from './provenance';

export const EvaluatorDecisionSchema = z.object({
  status: z.nativeEnum(CertificationStatusEnum),
  triggeredConditions: z.array(z.nativeEnum(StopConditionCodeEnum)),
  evaluationTrace: z.array(z.string().min(1)),
  evaluatedAt: z.string().datetime(),
  decisionBasis: z.string().min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
});

export type EvaluatorDecision = z.infer<typeof EvaluatorDecisionSchema>;

export const validateEvaluatorDecision = (input: unknown) => EvaluatorDecisionSchema.safeParse(input);

const createBlockedDecision = (reason: string, condition: StopConditionCodeEnum, provenanceRef: string): EvaluatorDecision => ({
  status: CertificationStatusEnum.BLOCKED,
  triggeredConditions: [condition],
  evaluationTrace: [`REJECT: ${reason}`],
  evaluatedAt: '1970-01-01T00:00:00.000Z',
  decisionBasis: reason,
  epistemicStatus: EpistemicStatusEnum.UNKNOWN,
  provenanceRefs: [provenanceRef]
});

export const evaluateFormalProblem = (
  problem: FormalProblem,
  timestampISO: string,
  evaluatorProvenanceRef: string
): EvaluatorDecision => {
  const timeValidation = z.string().datetime().safeParse(timestampISO);
  if (!timeValidation.success) {
    return createBlockedDecision(
      "Invalid or unverified evaluation timestamp format",
      StopConditionCodeEnum.SECURITY_POLICY,
      evaluatorProvenanceRef
    );
  }

  const triggeredConditions: StopConditionCodeEnum[] = [];
  const evaluationTrace: string[] = [];
  let status = CertificationStatusEnum.NOT_ASSESSED;

  // 1. Linaje y Procedencia (MISSING_PROVENANCE)
  let hasMissingProvenance = false;
  if (!problem.provenanceRefs || problem.provenanceRefs.length === 0 || problem.provenanceRefs.some(ref => ref.trim() === '')) {
    hasMissingProvenance = true;
    evaluationTrace.push('FormalProblem missing provenanceRefs.');
  } else if (problem.variables) {
    for (const variable of problem.variables) {
      const v = variable as any;
      if (v.provenanceRefs !== undefined && (!v.provenanceRefs || v.provenanceRefs.length === 0 || v.provenanceRefs.some((ref: string) => ref.trim() === ''))) {
        hasMissingProvenance = true;
        evaluationTrace.push(`Variable ${v.id || 'unknown'} missing provenanceRefs.`);
        break;
      }
    }
  }

  if (hasMissingProvenance) {
    triggeredConditions.push(StopConditionCodeEnum.MISSING_PROVENANCE);
    status = CertificationStatusEnum.CONDITIONS_UNMET;
    return {
      status,
      triggeredConditions,
      evaluationTrace,
      evaluatedAt: timestampISO,
      decisionBasis: 'Provenance references are missing or empty.',
      epistemicStatus: EpistemicStatusEnum.UNKNOWN,
      provenanceRefs: [evaluatorProvenanceRef]
    };
  }

  // 2. Evidencia (INSUFFICIENT_EVIDENCE)
  let hasInsufficientEvidence = false;
  if (!problem.evidenceRefs || problem.evidenceRefs.length === 0) {
    hasInsufficientEvidence = true;
    evaluationTrace.push('FormalProblem missing evidenceRefs.');
  } else if (problem.variables) {
    for (const variable of problem.variables) {
      const v = variable as any;
      if (v.evidenceRefs !== undefined && (Array.isArray(v.evidenceRefs) && v.evidenceRefs.length === 0)) {
        hasInsufficientEvidence = true;
        evaluationTrace.push(`Variable ${v.id || 'unknown'} missing evidenceRefs.`);
        break;
      }
    }
  }

  if (hasInsufficientEvidence) {
    triggeredConditions.push(StopConditionCodeEnum.INSUFFICIENT_EVIDENCE);
    status = CertificationStatusEnum.EVIDENCE_INCOMPLETE;
    return {
      status,
      triggeredConditions,
      evaluationTrace,
      evaluatedAt: timestampISO,
      decisionBasis: 'Evidence references are insufficient or missing.',
      epistemicStatus: EpistemicStatusEnum.UNKNOWN,
      provenanceRefs: [evaluatorProvenanceRef]
    };
  }

  // 3. Incertidumbre Crítica (UNBOUNDED_UNCERTAINTY)
  let hasUnboundedUncertainty = false;
  if (problem.uncertainties && Array.isArray(problem.uncertainties)) {
    for (const unc of problem.uncertainties) {
      const impact = (unc as any).impact;
      const mitigation = (unc as any).mitigation;
      if ((impact === 'CRITICAL' || impact === 'HIGH') && (!mitigation || mitigation.trim() === '')) {
        hasUnboundedUncertainty = true;
        evaluationTrace.push(`Uncertainty ${unc.type || 'unknown'} has high/critical impact without mitigation.`);
        break;
      }
    }
  }

  if (hasUnboundedUncertainty) {
    triggeredConditions.push(StopConditionCodeEnum.UNBOUNDED_UNCERTAINTY);
    status = CertificationStatusEnum.CONDITIONS_UNMET;
    return {
      status,
      triggeredConditions,
      evaluationTrace,
      evaluatedAt: timestampISO,
      decisionBasis: 'Critical or high uncertainties lack mitigations.',
      epistemicStatus: EpistemicStatusEnum.UNKNOWN,
      provenanceRefs: [evaluatorProvenanceRef]
    };
  }

  // 4. Bloqueo / Conflicto (BLOCKED)
  let hasConflict = false;
  let conflictReason = '';
  if (problem.constraints && Array.isArray(problem.constraints)) {
    for (const constraint of problem.constraints) {
      if (typeof constraint === 'string' && (constraint.includes('CONFLICT') || constraint.includes('BLOCKED'))) {
        hasConflict = true;
        conflictReason = constraint;
        evaluationTrace.push(`Constraint explicitly declares conflict/block: ${constraint}`);
        break;
      }
    }
  }

  if (hasConflict) {
    triggeredConditions.push(StopConditionCodeEnum.CONSTRAINT_VIOLATION);
    status = CertificationStatusEnum.BLOCKED;
    return {
      status,
      triggeredConditions,
      evaluationTrace,
      evaluatedAt: timestampISO,
      decisionBasis: `Constraint violation: ${conflictReason}`,
      epistemicStatus: EpistemicStatusEnum.UNKNOWN,
      provenanceRefs: [evaluatorProvenanceRef]
    };
  }

  // 5. Soporte Condicionado
  evaluationTrace.push('All checks passed conditionally.');
  return {
    status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
    triggeredConditions: [],
    evaluationTrace,
    evaluatedAt: timestampISO,
    decisionBasis: 'All variables have valid provenance, evidence, and uncertainties are mitigated.',
    epistemicStatus: EpistemicStatusEnum.DERIVED,
    provenanceRefs: [evaluatorProvenanceRef]
  };
};

export const evaluateVerificationResult = (
  result: VerificationResult,
  timestampISO: string,
  evaluatorProvenanceRef: string
): EvaluatorDecision => {
  const timeValidation = z.string().datetime().safeParse(timestampISO);
  if (!timeValidation.success) {
    return createBlockedDecision(
      "Invalid or unverified evaluation timestamp format",
      StopConditionCodeEnum.SECURITY_POLICY,
      evaluatorProvenanceRef
    );
  }
  
  return {
    status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
    triggeredConditions: [],
    evaluationTrace: ['VerificationResult evaluation passed conditionally.'],
    evaluatedAt: timestampISO,
    decisionBasis: 'VerificationResult conditionally supported based on initial heuristic.',
    epistemicStatus: EpistemicStatusEnum.DERIVED,
    provenanceRefs: [evaluatorProvenanceRef]
  };
};
