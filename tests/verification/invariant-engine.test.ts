import { 
  validateInvariantDefinition,
  validateInvariantBinding,
  InvariantSeverityEnum,
  InvariantKindEnum
} from '../../src/verification/invariant-engine';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('invariant-engine', () => {
  describe('InvariantDefinitionSchema', () => {
    it('should return SafeParseResult', () => {
      const res = validateInvariantDefinition({});
      expect(res).toHaveProperty('success');
      expect(res).not.toHaveProperty('status');
    });

    it('accepts valid invariant', () => {
      const valid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Assets = Liabilities + Equity',
        expression: 'A = L + E',
        variableRefs: ['A', 'L', 'E'],
        unitRefs: ['CLP'],
        domainRefs: ['dom-1'],
        constraintRefs: ['const-1'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      const result = validateInvariantDefinition(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expression).toBe('A = L + E'); // Expression conserved exactly
      }
    });

    it('rejects empty arrays for refs', () => {
      const invalid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Assets = Liabilities + Equity',
        expression: 'A = L + E',
        variableRefs: [],
        unitRefs: [],
        domainRefs: [],
        constraintRefs: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects missing mandatory field', () => {
      const invalid = {
        id: 'inv-1'
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects invalid kind enum', () => {
      const invalid = {
        id: 'inv-1',
        kind: 'INVALID_INVARIANT_KIND',
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Desc',
        expression: 'A',
        variableRefs: ['A'],
        unitRefs: ['U'],
        domainRefs: ['D'],
        constraintRefs: ['C'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects invalid severity enum', () => {
      const invalid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: 'INVALID_SEVERITY',
        description: 'Desc',
        expression: 'A',
        variableRefs: ['A'],
        unitRefs: ['U'],
        domainRefs: ['D'],
        constraintRefs: ['C'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs', () => {
      const invalid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Desc',
        expression: 'A',
        variableRefs: ['A'],
        unitRefs: ['U'],
        domainRefs: ['D'],
        constraintRefs: ['C'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Desc',
        expression: 'A',
        variableRefs: ['A'],
        unitRefs: ['U'],
        domainRefs: ['D'],
        constraintRefs: ['C'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });

    it('rejects empty expression', () => {
      const invalid = {
        id: 'inv-1',
        kind: InvariantKindEnum.CONSERVATION,
        severity: InvariantSeverityEnum.CRITICAL,
        description: 'Desc',
        expression: '',
        variableRefs: ['A'],
        unitRefs: ['U'],
        domainRefs: ['D'],
        constraintRefs: ['C'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantDefinition(invalid).success).toBe(false);
    });
  });

  describe('InvariantBindingSchema', () => {
    it('should return SafeParseResult', () => {
      const res = validateInvariantBinding({});
      expect(res).toHaveProperty('success');
      expect(res).not.toHaveProperty('status');
    });

    it('accepts minimal valid payload', () => {
      const valid = {
        invariantId: 'inv-1',
        formalProblemId: 'prob-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantBinding(valid).success).toBe(true);
    });

    it('rejects missing invariantId', () => {
      const invalid = {
        formalProblemId: 'prob-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantBinding(invalid).success).toBe(false);
    });

    it('rejects missing formalProblemId', () => {
      const invalid = {
        invariantId: 'inv-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateInvariantBinding(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs', () => {
      const invalid = {
        invariantId: 'inv-1',
        formalProblemId: 'prob-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateInvariantBinding(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        invariantId: 'inv-1',
        formalProblemId: 'prob-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateInvariantBinding(invalid).success).toBe(false);
    });
  });
});
