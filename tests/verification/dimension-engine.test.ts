import { 
  validateUnitDefinition, 
  validateUnitCompatibilityRule, 
  DimensionKindEnum, 
  UnitOperationEnum 
} from '../../src/verification/dimension-engine';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('dimension-engine', () => {
  it('should return a Zod SafeParseResult for UnitDefinition', () => {
    const res = validateUnitDefinition({});
    expect(res).toHaveProperty('success');
    expect(res).not.toHaveProperty('status');
  });

  describe('UnitDefinitionSchema', () => {
    it('accepts minimal valid payload', () => {
      const valid = {
        id: 'clp-unit',
        symbol: 'CLP',
        dimension: DimensionKindEnum.CURRENCY,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateUnitDefinition(valid).success).toBe(true);
    });

    it('accepts full valid payload', () => {
      const valid = {
        id: 'clp-unit',
        symbol: 'CLP',
        dimension: DimensionKindEnum.CURRENCY,
        description: 'Peso Chileno',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        notes: 'Legal tender'
      };
      expect(validateUnitDefinition(valid).success).toBe(true);
    });

    it('rejects invalid enum', () => {
      const invalid = {
        id: 'clp-unit',
        symbol: 'CLP',
        dimension: 'INVALID_DIMENSION',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateUnitDefinition(invalid).success).toBe(false);
    });

    it('rejects missing mandatory field', () => {
      const invalid = {
        symbol: 'CLP',
        dimension: DimensionKindEnum.CURRENCY,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateUnitDefinition(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs array', () => {
      const invalid = {
        id: 'clp-unit',
        symbol: 'CLP',
        dimension: DimensionKindEnum.CURRENCY,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateUnitDefinition(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        id: 'clp-unit',
        symbol: 'CLP',
        dimension: DimensionKindEnum.CURRENCY,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateUnitDefinition(invalid).success).toBe(false);
    });
  });

  describe('UnitCompatibilityRuleSchema', () => {
    it('should return a Zod SafeParseResult', () => {
      const res = validateUnitCompatibilityRule({});
      expect(res).toHaveProperty('success');
      expect(res).not.toHaveProperty('status');
    });

    it('accepts valid payload', () => {
      const valid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: 'Cannot add different currencies',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(valid).success).toBe(true);
    });

    it('rejects invalid operation enum', () => {
      const invalid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: 'INVALID_OPERATION',
        compatible: false,
        reason: 'Cannot add different currencies',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs', () => {
      const invalid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: 'Reason',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: 'Reason',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects absence of reason', () => {
      const invalid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects empty string reason', () => {
      const invalid = {
        leftUnitId: 'CLP',
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: '',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects absence of leftUnitId', () => {
      const invalid = {
        rightUnitId: 'UF',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: 'Reason',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });

    it('rejects absence of rightUnitId', () => {
      const invalid = {
        leftUnitId: 'CLP',
        operation: UnitOperationEnum.ADD,
        compatible: false,
        reason: 'Reason',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['rule-1']
      };
      expect(validateUnitCompatibilityRule(invalid).success).toBe(false);
    });
  });
});
