import { MathReceiptSchema } from '../../src/verification/math-receipt';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('MathReceiptSchema', () => {
  it('should parse a valid math receipt', () => {
    const valid = {
      id: 'receipt-01',
      method: 'A + B',
      inputs: [
        { id: 'in1', value: '10.5', epistemicStatus: EpistemicStatusEnum.OBSERVED }
      ],
      output: {
        value: '10.5',
        epistemicStatus: EpistemicStatusEnum.DERIVED
      },
      precisionOrRoundingRule: 'EXACT',
      assumptions: [],
      constraints: [],
      evidenceRefs: [],
      provenanceRefs: [],
      uncertainties: [],
      recordedAt: '2026-09-30T15:00:00.000Z'
    };
    expect(() => MathReceiptSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid recordedAt', () => {
    const invalid = {
      id: 'receipt-01',
      method: 'A + B',
      inputs: [
        { id: 'in1', value: '10.5', epistemicStatus: EpistemicStatusEnum.OBSERVED }
      ],
      output: { value: '10.5', epistemicStatus: EpistemicStatusEnum.DERIVED },
      precisionOrRoundingRule: 'EXACT',
      assumptions: [],
      constraints: [],
      evidenceRefs: [],
      provenanceRefs: [],
      uncertainties: [],
      recordedAt: 'timestamp-not-iso'
    };
    expect(MathReceiptSchema.safeParse(invalid).success).toBe(false);
  });
});
