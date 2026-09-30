import { VerificationResultSchema, VerificationStatusEnum } from '../../src/verification/verification-result';

describe('VerificationResultSchema', () => {
  it('should parse a valid pass result', () => {
    const valid = {
      id: 'res-01',
      status: VerificationStatusEnum.PASS,
      summary: 'All checks passed',
      findings: ['Finding 1'],
      evidenceRefs: [],
      appliedConstraints: [],
      warnings: [],
      stopConditions: [],
      recordedAt: '2026-09-30T15:00:00.000Z',
      provenanceRefs: [],
      uncertainties: []
    };
    expect(() => VerificationResultSchema.parse(valid)).not.toThrow();
  });

  it('should parse a valid blocked result with stop conditions', () => {
    const valid = {
      id: 'res-02',
      status: VerificationStatusEnum.BLOCKED,
      summary: 'Blocked by critical condition',
      findings: [],
      evidenceRefs: [],
      appliedConstraints: [],
      warnings: [],
      stopConditions: [
        {
          code: 'SECURITY_POLICY',
          severity: 'CRITICAL',
          description: 'Policy violation',
          recommendedEffect: 'BLOCKED',
          epistemicStatus: 'OBSERVED'
        }
      ],
      recordedAt: '2026-09-30T15:00:00.000Z',
      provenanceRefs: [],
      uncertainties: []
    };
    expect(() => VerificationResultSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid recordedAt', () => {
    const invalid = {
      id: 'res-03',
      status: VerificationStatusEnum.INCONCLUSIVE,
      summary: 'Test',
      findings: [],
      evidenceRefs: [],
      appliedConstraints: [],
      warnings: [],
      stopConditions: [],
      recordedAt: '2026-09-30', // not iso datetime
      provenanceRefs: [],
      uncertainties: []
    };
    expect(VerificationResultSchema.safeParse(invalid).success).toBe(false);
  });
});
