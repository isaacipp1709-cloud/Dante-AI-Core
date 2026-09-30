import { FormalProblemSchema } from '../../src/verification/formal-problem';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('FormalProblemSchema', () => {
  it('should parse a valid formal problem', () => {
    const valid = {
      id: 'problem-001',
      variables: [
        {
          id: 'var1',
          value: '1000.50',
          epistemicStatus: EpistemicStatusEnum.OBSERVED,
          provenanceRefs: ['prov-1'],
          evidenceRefs: []
        }
      ],
      units: { 'var1': 'USD' },
      domains: { 'var1': 'POSITIVE_NUMBERS' },
      assumptions: ['No inflation'],
      constraints: ['var1 > 0'],
      evidenceRefs: ['doc-1'],
      objective: 'Calculate tax',
      temporalScope: '2026',
      provenanceRefs: ['prov-main'],
      uncertainties: []
    };
    expect(() => FormalProblemSchema.parse(valid)).not.toThrow();
  });

  it('should reject empty variables array', () => {
    const invalid = {
      id: 'problem-001',
      variables: [],
      units: {},
      domains: {},
      assumptions: [],
      constraints: [],
      evidenceRefs: [],
      objective: 'Calculate tax',
      temporalScope: '2026',
      provenanceRefs: [],
      uncertainties: []
    };
    expect(FormalProblemSchema.safeParse(invalid).success).toBe(false);
  });
});
