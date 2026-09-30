import { ProvenanceSchema, EpistemicStatusEnum, validateExtendedProvenance } from '../../src/verification/provenance';

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

describe('ExtendedProvenanceSchema', () => {
  it('should parse valid extended provenance with empty arrays', () => {
    const valid = {
      id: 'prov-ext-1',
      sourceType: 'SENSOR',
      reference: 'S-1',
      recordedAt: '2026-09-30T15:00:00.000Z',
      epistemicStatus: EpistemicStatusEnum.OBSERVED,
      attestations: [],
      custodyChains: [],
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedProvenance(valid);
    expect(result.success).toBe(true);
  });

  it('should parse valid extended provenance with full fields', () => {
    const valid = {
      id: 'prov-ext-1',
      sourceType: 'SENSOR',
      reference: 'S-1',
      recordedAt: '2026-09-30T15:00:00.000Z',
      epistemicStatus: EpistemicStatusEnum.OBSERVED,
      attestations: [{
        attestationId: 'att-1',
        attestorId: 'agent-1',
        attestedAt: '2026-09-30T15:05:00.000Z'
      }],
      custodyChains: [{
        chainId: 'chain-1',
        transfers: [{
          handlerId: 'handler-1',
          transferredAt: '2026-09-30T15:10:00.000Z',
          action: 'RECEIVED'
        }]
      }],
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedProvenance(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid timestamps in attestation', () => {
    const invalid = {
      id: 'prov-ext-1',
      sourceType: 'SENSOR',
      reference: 'S-1',
      recordedAt: '2026-09-30T15:00:00.000Z',
      epistemicStatus: EpistemicStatusEnum.OBSERVED,
      attestations: [{
        attestationId: 'att-1',
        attestorId: 'agent-1',
        attestedAt: 'invalid-date'
      }],
      custodyChains: [],
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedProvenance(invalid);
    expect(result.success).toBe(false);
  });
  
  it('should reject empty arrays in custody transfer', () => {
    const invalid = {
      id: 'prov-ext-1',
      sourceType: 'SENSOR',
      reference: 'S-1',
      recordedAt: '2026-09-30T15:00:00.000Z',
      epistemicStatus: EpistemicStatusEnum.OBSERVED,
      attestations: [],
      custodyChains: [{
        chainId: 'chain-1',
        transfers: []
      }],
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedProvenance(invalid);
    expect(result.success).toBe(false);
  });
});
