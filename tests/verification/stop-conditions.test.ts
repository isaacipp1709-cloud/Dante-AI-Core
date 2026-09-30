import { 
  StopConditionSchema, 
  StopConditionCodeEnum, 
  StopConditionSeverityEnum, 
  RecommendedEffectEnum 
} from '../../src/verification/stop-conditions';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('StopConditionSchema', () => {
  it('should parse valid stop condition', () => {
    const valid = {
      code: StopConditionCodeEnum.MISSING_UNIT,
      severity: StopConditionSeverityEnum.WARNING,
      description: 'Unit is missing for variable X',
      recommendedEffect: RecommendedEffectEnum.INCONCLUSIVE,
      epistemicStatus: EpistemicStatusEnum.OBSERVED
    };
    expect(() => StopConditionSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid code', () => {
    const invalid = {
      code: 'UNKNOWN_CODE',
      severity: StopConditionSeverityEnum.ERROR,
      description: 'Desc',
      recommendedEffect: RecommendedEffectEnum.BLOCKED,
      epistemicStatus: EpistemicStatusEnum.DERIVED
    };
    expect(StopConditionSchema.safeParse(invalid).success).toBe(false);
  });
});
