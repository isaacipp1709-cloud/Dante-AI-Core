import { evaluateFormalProblem, EvaluatorDecisionSchema, validateEvaluatorDecision } from '../../src/verification/verification-evaluator';
import { StopConditionCodeEnum } from '../../src/verification/stop-conditions';
import { CertificationStatusEnum } from '../../src/verification/certification-state';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('VerificationEvaluator', () => {
  const evaluatorRef = 'engine-v1';
  
  it('should reject invalid timestamp', () => {
    const problem = {} as any;
    const result = evaluateFormalProblem(problem, 'not-a-timestamp', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.BLOCKED);
    expect(result.triggeredConditions).toContain(StopConditionCodeEnum.SECURITY_POLICY);
    expect(result.evaluatedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should degrade to CONDITIONS_UNMET if MISSING_PROVENANCE in FormalProblem', () => {
    const problem = {
      provenanceRefs: [],
      variables: [],
      evidenceRefs: ['ev-1']
    } as any;
    const result = evaluateFormalProblem(problem, '2026-09-30T15:00:00.000Z', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.CONDITIONS_UNMET);
    expect(result.triggeredConditions).toContain(StopConditionCodeEnum.MISSING_PROVENANCE);
  });

  it('should degrade to EVIDENCE_INCOMPLETE if INSUFFICIENT_EVIDENCE', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [],
      evidenceRefs: []
    } as any;
    const result = evaluateFormalProblem(problem, '2026-09-30T15:00:00.000Z', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.EVIDENCE_INCOMPLETE);
    expect(result.triggeredConditions).toContain(StopConditionCodeEnum.INSUFFICIENT_EVIDENCE);
  });

  it('should degrade to CONDITIONS_UNMET if UNBOUNDED_UNCERTAINTY', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'CRITICAL', mitigation: '' }]
    } as any;
    const result = evaluateFormalProblem(problem, '2026-09-30T15:00:00.000Z', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.CONDITIONS_UNMET);
    expect(result.triggeredConditions).toContain(StopConditionCodeEnum.UNBOUNDED_UNCERTAINTY);
  });

  it('should degrade to BLOCKED on CONSTRAINT_VIOLATION explicit conflict', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'LOW' }],
      constraints: ['Data has CONFLICT with domain logic']
    } as any;
    const result = evaluateFormalProblem(problem, '2026-09-30T15:00:00.000Z', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.BLOCKED);
    expect(result.triggeredConditions).toContain(StopConditionCodeEnum.CONSTRAINT_VIOLATION);
  });

  it('should reach CONDITIONALLY_SUPPORTED for fully compliant problem', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [{ id: 'var-1', provenanceRefs: ['prov-2'], evidenceRefs: ['ev-2'] }],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'HIGH', mitigation: 'Added buffer' }],
      constraints: ['Strict bound']
    } as any;
    
    // Inmutabilidad
    Object.freeze(problem);
    
    const result = evaluateFormalProblem(problem, '2026-09-30T15:00:00.000Z', evaluatorRef);
    expect(result.status).toBe(CertificationStatusEnum.CONDITIONALLY_SUPPORTED);
    expect(result.triggeredConditions).toHaveLength(0);
    expect(result.epistemicStatus).toBe(EpistemicStatusEnum.DERIVED);
    expect(validateEvaluatorDecision(result).success).toBe(true);
  });
});
