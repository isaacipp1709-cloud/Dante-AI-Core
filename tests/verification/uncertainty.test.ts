import { UncertaintySchema, UncertaintyTypeEnum, validateExtendedUncertainty } from '../../src/verification/uncertainty';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('UncertaintySchema', () => {
  it('should parse valid uncertainty without optionals', () => {
    const valid = {
      type: 'ESTIMATION',
      description: 'Lack of exact historical data',
      impact: 'HIGH'
    };
    expect(() => UncertaintySchema.parse(valid)).not.toThrow();
  });

  it('should parse valid uncertainty with optionals', () => {
    const valid = {
      type: 'MEASUREMENT',
      description: 'Sensor tolerance',
      range: '1.5-2.0',
      unit: 'kg',
      confidenceLevel: '95%',
      impact: 'LOW',
      mitigation: 'Add buffer'
    };
    expect(() => UncertaintySchema.parse(valid)).not.toThrow();
  });

  it('should reject missing mandatory fields', () => {
    const invalid = {
      description: 'Missing type and impact'
    };
    expect(UncertaintySchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ExtendedUncertaintySchema', () => {
  it('should parse valid extended uncertainty', () => {
    const valid = {
      id: 'ext-unc-1',
      type: UncertaintyTypeEnum.MEASUREMENT,
      description: 'Sensor error',
      lowerBound: '-0.5',
      upperBound: '0.5',
      confidenceLevel: '99%',
      justification: 'Datasheet spec',
      epistemicStatus: EpistemicStatusEnum.OBSERVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedUncertainty(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid array lengths (empty provenanceRefs)', () => {
    const invalid = {
      id: 'ext-unc-1',
      type: UncertaintyTypeEnum.VARIABILITY,
      description: 'Sample variance',
      justification: 'Stat analysis',
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: []
    };
    const result = validateExtendedUncertainty(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid enum type', () => {
    const invalid = {
      id: 'ext-unc-1',
      type: 'UNKNOWN_TYPE',
      description: 'Sample variance',
      justification: 'Stat analysis',
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedUncertainty(invalid);
    expect(result.success).toBe(false);
  });
  
  it('should reject empty strings in required fields', () => {
    const invalid = {
      id: '',
      type: UncertaintyTypeEnum.VARIABILITY,
      description: 'Sample variance',
      justification: 'Stat analysis',
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedUncertainty(invalid);
    expect(result.success).toBe(false);
  });
});
