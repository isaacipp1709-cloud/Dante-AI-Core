import { ProvenanceSchema, EpistemicStatusEnum } from '../../src/verification/provenance';

describe('ProvenanceSchema', () => {
  it('should parse valid provenance without optionals', () => {
    const valid = {
      id: 'prov-001',
      sourceType: 'TAX_LAW',
      reference: 'Article 1',
      recordedAt: '2026-09-30T15:00:00.000Z',
      epistemicStatus: EpistemicStatusEnum.OBSERVED
    };
    expect(() => ProvenanceSchema.parse(valid)).not.toThrow();
  });

  it('should parse valid provenance with all optionals', () => {
    const valid = {
      id: 'prov-002',
      sourceType: 'USER_INPUT',
      reference: 'Form Field A',
      originator: 'Admin',
      recordedAt: '2026-09-30T15:00:00.000Z',
      hash: 'abc123hash',
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      notes: 'Manually verified'
    };
    expect(() => ProvenanceSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid recordedAt', () => {
    const invalid = {
      id: 'prov-003',
      sourceType: 'API',
      reference: 'Data',
      recordedAt: 'Not-an-ISO-date',
      epistemicStatus: EpistemicStatusEnum.ASSUMED
    };
    expect(ProvenanceSchema.safeParse(invalid).success).toBe(false);
  });
});
