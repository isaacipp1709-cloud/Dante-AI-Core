import { 
  validateVerificationPolicy, 
  VerificationPolicyModeEnum 
} from '../../src/verification/verification-policy';
import { EvidenceKindEnum } from '../../src/verification/evidence-link';
import { CertificationStatusEnum } from '../../src/verification/certification-state';
import { RecommendedEffectEnum } from '../../src/verification/stop-conditions';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('verification-policy', () => {
  it('should return SafeParseResult and lack VerificationResult', () => {
    const res = validateVerificationPolicy({});
    expect(res).toHaveProperty('success');
    expect(res).not.toHaveProperty('status');
  });

  describe('VerificationPolicySchema', () => {
    it('accepts minimal valid payload', () => {
      const valid = {
        id: 'pol-1',
        mode: VerificationPolicyModeEnum.DETERMINISTIC,
        description: 'Strict match policy',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT],
        requiredInvariantRefs: [],
        requiredDomainRefs: [],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateVerificationPolicy(valid).success).toBe(true);
    });

    it('accepts full valid payload', () => {
      const valid = {
        id: 'pol-1',
        mode: VerificationPolicyModeEnum.DETERMINISTIC,
        description: 'Strict match policy',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT, EvidenceKindEnum.DATASET],
        requiredInvariantRefs: ['inv-1'],
        requiredDomainRefs: ['dom-1'],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: [RecommendedEffectEnum.BLOCKED],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        notes: 'Test policy'
      };
      expect(validateVerificationPolicy(valid).success).toBe(true);
    });

    it('rejects invalid mode', () => {
      const invalid = {
        id: 'pol-1',
        mode: 'INVALID_MODE',
        description: 'Desc',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT],
        requiredInvariantRefs: [],
        requiredDomainRefs: [],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateVerificationPolicy(invalid).success).toBe(false);
    });

    it('rejects empty arrays for mandatory elements', () => {
      const buildInvalid = (override: any) => ({
        id: 'pol-1',
        mode: VerificationPolicyModeEnum.DETERMINISTIC,
        description: 'Strict match policy',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT],
        requiredInvariantRefs: [],
        requiredDomainRefs: [],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        ...override
      });

      expect(validateVerificationPolicy(buildInvalid({ requiredEvidenceKinds: [] })).success).toBe(false);
      expect(validateVerificationPolicy(buildInvalid({ allowedCertificationStatuses: [] })).success).toBe(false);
      expect(validateVerificationPolicy(buildInvalid({ provenanceRefs: [] })).success).toBe(false);
      expect(validateVerificationPolicy(buildInvalid({ provenanceRefs: [''] })).success).toBe(false);
    });

    it('rejects empty strings inside arrays', () => {
      const buildInvalid = (override: any) => ({
        id: 'pol-1',
        mode: VerificationPolicyModeEnum.DETERMINISTIC,
        description: 'Strict match policy',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT],
        requiredInvariantRefs: [],
        requiredDomainRefs: [],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: [],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        ...override
      });

      expect(validateVerificationPolicy(buildInvalid({ requiredInvariantRefs: [''] })).success).toBe(false);
      expect(validateVerificationPolicy(buildInvalid({ requiredDomainRefs: [''] })).success).toBe(false);
    });

    it('rejects invalid enum in requiredStopConditionEffects', () => {
      const invalid = {
        id: 'pol-1',
        mode: VerificationPolicyModeEnum.DETERMINISTIC,
        description: 'Desc',
        requiredEvidenceKinds: [EvidenceKindEnum.DOCUMENT],
        requiredInvariantRefs: [],
        requiredDomainRefs: [],
        allowedCertificationStatuses: [CertificationStatusEnum.CONDITIONALLY_SUPPORTED],
        requiredStopConditionEffects: ['INVALID_EFFECT'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateVerificationPolicy(invalid).success).toBe(false);
    });
  });
});
