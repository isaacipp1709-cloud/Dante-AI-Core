import { 
  validateCertificationState, 
  CertificationStatusEnum 
} from '../../src/verification/certification-state';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('certification-state', () => {
  it('should return SafeParseResult and lack business status', () => {
    const res = validateCertificationState({});
    expect(res).toHaveProperty('success');
    expect(res).not.toHaveProperty('status');
  });

  describe('CertificationStateSchema', () => {
    it('accepts minimal valid payload', () => {
      const valid = {
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Calculations match receipts',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Pending audit'],
        limitations: ['Data from API'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1']
      };
      expect(validateCertificationState(valid).success).toBe(true);
    });

    it('accepts full valid payload', () => {
      const valid = {
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Calculations match receipts',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: ['math-1'],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: ['unc-1'],
        stopConditionRefs: ['stop-1'],
        conditions: ['Pending audit'],
        limitations: ['Data from API'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1'],
        notes: 'Final check done'
      };
      expect(validateCertificationState(valid).success).toBe(true);
    });

    it('rejects invalid status', () => {
      const invalid = {
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: 'ABSOLUTE',
        basis: 'Basis',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Cond'],
        limitations: ['Lim'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1']
      };
      expect(validateCertificationState(invalid).success).toBe(false);
    });

    it('rejects invalid timestamp', () => {
      const invalid = {
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Basis',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Cond'],
        limitations: ['Lim'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: 'not-a-date',
        provenanceRefs: ['ref-1']
      };
      expect(validateCertificationState(invalid).success).toBe(false);
    });

    it('rejects absence of formalProblemId', () => {
      const invalid = {
        id: 'cert-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Basis',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Cond'],
        limitations: ['Lim'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1']
      };
      expect(validateCertificationState(invalid).success).toBe(false);
    });

    it('rejects empty arrays for mandatory refs', () => {
      const buildInvalid = (override: any) => ({
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Basis',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Cond'],
        limitations: ['Lim'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1'],
        ...override
      });

      expect(validateCertificationState(buildInvalid({ evidenceRefs: [] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ verificationResultRefs: [] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ conditions: [] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ limitations: [] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ provenanceRefs: [] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ provenanceRefs: [''] })).success).toBe(false);
    });

    it('rejects empty string elements in optional array refs', () => {
      const buildInvalid = (override: any) => ({
        id: 'cert-1',
        formalProblemId: 'prob-1',
        status: CertificationStatusEnum.CONDITIONALLY_SUPPORTED,
        basis: 'Basis',
        verificationResultRefs: ['res-1'],
        mathReceiptRefs: [],
        evidenceRefs: ['ev-1'],
        uncertaintyRefs: [],
        stopConditionRefs: [],
        conditions: ['Cond'],
        limitations: ['Lim'],
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        recordedAt: '2026-09-30T15:00:00.000Z',
        provenanceRefs: ['ref-1'],
        ...override
      });

      expect(validateCertificationState(buildInvalid({ mathReceiptRefs: [''] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ uncertaintyRefs: [''] })).success).toBe(false);
      expect(validateCertificationState(buildInvalid({ stopConditionRefs: [''] })).success).toBe(false);
    });
  });
});
