import { 
  validateDomainDefinition, 
  validateDomainBinding,
  DomainKindEnum 
} from '../../src/verification/domain-validator';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('domain-validator', () => {
  it('should return SafeParseResult for DomainDefinition', () => {
    expect(validateDomainDefinition({}).success).toBe(false);
  });

  describe('DomainDefinitionSchema', () => {
    it('accepts valid numeric domain', () => {
      const valid = {
        id: 'dom-1',
        kind: DomainKindEnum.NUMERIC,
        description: 'A number',
        minimum: '0.00',
        maximum: '100.00',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(valid).success).toBe(true);
    });

    it('rejects minimum as native number', () => {
      const invalid = {
        id: 'dom-1',
        kind: DomainKindEnum.NUMERIC,
        description: 'A number',
        minimum: 0,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });

    it('accepts ENUM domain with allowedValues', () => {
      const valid = {
        id: 'dom-2',
        kind: DomainKindEnum.ENUM,
        description: 'Status enum',
        allowedValues: ['ACTIVE', 'INACTIVE'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(valid).success).toBe(true);
    });

    it('rejects ENUM domain without allowedValues', () => {
      const invalid = {
        id: 'dom-2',
        kind: DomainKindEnum.ENUM,
        description: 'Status enum',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });

    it('rejects ENUM domain with empty allowedValues', () => {
      const invalid = {
        id: 'dom-2',
        kind: DomainKindEnum.ENUM,
        description: 'Status enum',
        allowedValues: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });
    
    it('rejects empty provenanceRefs array', () => {
      const invalid = {
        id: 'dom-1',
        kind: DomainKindEnum.NUMERIC,
        description: 'A number',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });

    it('rejects invalid domain kind enum', () => {
      const invalid = {
        id: 'dom-1',
        kind: 'INVALID_DOMAIN_KIND',
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });

    it('rejects missing description', () => {
      const invalid = {
        id: 'dom-1',
        kind: DomainKindEnum.NUMERIC,
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        id: 'dom-1',
        kind: DomainKindEnum.NUMERIC,
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateDomainDefinition(invalid).success).toBe(false);
    });
  });

  describe('DomainBindingSchema', () => {
    it('should return a Zod SafeParseResult', () => {
      const res = validateDomainBinding({});
      expect(res).toHaveProperty('success');
      expect(res).not.toHaveProperty('status');
    });

    it('accepts minimal valid payload', () => {
      const valid = {
        variableId: 'var-1',
        domainId: 'dom-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainBinding(valid).success).toBe(true);
    });

    it('rejects missing variableId', () => {
      const invalid = {
        domainId: 'dom-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainBinding(invalid).success).toBe(false);
    });

    it('rejects missing domainId', () => {
      const invalid = {
        variableId: 'var-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateDomainBinding(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs array', () => {
      const invalid = {
        variableId: 'var-1',
        domainId: 'dom-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateDomainBinding(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        variableId: 'var-1',
        domainId: 'dom-1',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateDomainBinding(invalid).success).toBe(false);
    });
  });
});
