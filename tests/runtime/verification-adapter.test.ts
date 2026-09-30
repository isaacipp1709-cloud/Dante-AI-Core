import { evaluateRuntimeIntent, validateRuntimeVerificationReport } from '../../src/runtime/verification-adapter';
import { CertificationStatusEnum } from '../../src/verification/certification-state';
import { StopConditionCodeEnum } from '../../src/verification/stop-conditions';

describe('VerificationAdapter', () => {
  const runtimeComponentId = 'runtime-orchestrator-1';
  const validTimestamp = '2026-09-30T15:00:00.000Z';

  it('should halt execution safely (BLOCKED) for conflicting constraints', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'LOW' }],
      constraints: ['Explicit CONFLICT declared']
    } as any;

    const report = evaluateRuntimeIntent(problem, validTimestamp, runtimeComponentId);

    expect(report.isPermitted).toBe(false);
    expect(report.haltReason).toBeDefined();
    expect(report.decision.status).toBe(CertificationStatusEnum.BLOCKED);
    expect(report.decision.triggeredConditions).toContain(StopConditionCodeEnum.CONSTRAINT_VIOLATION);
    expect(validateRuntimeVerificationReport(report).success).toBe(true);
  });

  it('should halt execution safely (CONDITIONS_UNMET) for unmitigated critical uncertainty', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'CRITICAL', mitigation: '' }]
    } as any;

    const report = evaluateRuntimeIntent(problem, validTimestamp, runtimeComponentId);

    expect(report.isPermitted).toBe(false);
    expect(report.haltReason).toBeDefined();
    expect(report.decision.status).toBe(CertificationStatusEnum.CONDITIONS_UNMET);
    expect(report.decision.triggeredConditions).toContain(StopConditionCodeEnum.UNBOUNDED_UNCERTAINTY);
    expect(validateRuntimeVerificationReport(report).success).toBe(true);
  });

  it('should permit execution conditionally (CONDITIONALLY_SUPPORTED)', () => {
    const problem = {
      provenanceRefs: ['prov-1'],
      variables: [{ id: 'var-1', provenanceRefs: ['prov-2'], evidenceRefs: ['ev-2'] }],
      evidenceRefs: ['ev-1'],
      uncertainties: [{ impact: 'HIGH', mitigation: 'Added buffer' }],
      constraints: ['Strict bound']
    } as any;
    
    // Inmutability check indirectly
    Object.freeze(problem);

    const report = evaluateRuntimeIntent(problem, validTimestamp, runtimeComponentId);

    expect(report.isPermitted).toBe(true);
    expect(report.haltReason).toBeUndefined();
    expect(report.decision.status).toBe(CertificationStatusEnum.CONDITIONALLY_SUPPORTED);
    expect(validateRuntimeVerificationReport(report).success).toBe(true);
  });

  it('should act as a safe barrier (fallback) on invalid timestamp injection', () => {
    const problem = {} as any;
    const report = evaluateRuntimeIntent(problem, 'invalid-date-format', runtimeComponentId);

    expect(report.isPermitted).toBe(false);
    expect(report.decision.status).toBe(CertificationStatusEnum.BLOCKED);
    expect(report.decision.triggeredConditions).toContain(StopConditionCodeEnum.SECURITY_POLICY);
    expect(validateRuntimeVerificationReport(report).success).toBe(true);
  });
});
