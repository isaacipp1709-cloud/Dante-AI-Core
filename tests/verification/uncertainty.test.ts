import { UncertaintySchema } from '../../src/verification/uncertainty';

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
