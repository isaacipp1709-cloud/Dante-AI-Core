import { MathReceiptSchema, PrecisionModeEnum, validateExtendedMathReceipt } from '../../src/verification/math-receipt';
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

describe('ExtendedMathReceiptSchema', () => {
  const baseReceipt = {
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
    provenanceRefs: ['ref-0'],
    uncertainties: [],
    recordedAt: '2026-09-30T15:00:00.000Z'
  };

  it('should parse valid extended math receipt', () => {
    const valid = {
      ...baseReceipt,
      precisionRule: {
        mode: PrecisionModeEnum.EXACT
      },
      compoundTraces: [],
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedMathReceipt(valid);
    expect(result.success).toBe(true);
  });

  it('should parse valid extended math receipt with full structures', () => {
    const valid = {
      ...baseReceipt,
      precisionRule: {
        mode: PrecisionModeEnum.ROUND_HALF_UP,
        precisionSpec: '2_DECIMALS',
        tolerance: '0.01'
      },
      compoundTraces: [{
        traceId: 'trace-1',
        steps: ['step-1'],
        intermediateValues: ['5.25']
      }],
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedMathReceipt(valid);
    expect(result.success).toBe(true);
  });

  it('should reject invalid precision mode', () => {
    const invalid = {
      ...baseReceipt,
      precisionRule: {
        mode: 'INVALID_MODE'
      },
      compoundTraces: [],
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedMathReceipt(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty arrays where required', () => {
    const invalid = {
      ...baseReceipt,
      precisionRule: {
        mode: PrecisionModeEnum.EXACT
      },
      compoundTraces: [{
        traceId: 'trace-1',
        steps: [],
        intermediateValues: []
      }],
      epistemicStatus: EpistemicStatusEnum.DERIVED,
      provenanceRefs: ['ref-1']
    };
    const result = validateExtendedMathReceipt(invalid);
    expect(result.success).toBe(false);
  });
});
