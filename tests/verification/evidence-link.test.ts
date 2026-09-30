import { 
  validateEvidenceLink, 
  EvidenceKindEnum 
} from '../../src/verification/evidence-link';
import { EpistemicStatusEnum } from '../../src/verification/provenance';

describe('evidence-link', () => {
  it('should return SafeParseResult', () => {
    const res = validateEvidenceLink({});
    expect(res).toHaveProperty('success');
  });

  describe('EvidenceLinkSchema', () => {
    it('accepts minimal valid payload', () => {
      const valid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Invoice 123',
        description: 'Client invoice',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateEvidenceLink(valid).success).toBe(true);
    });

    it('accepts full valid payload', () => {
      const valid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Invoice 123',
        description: 'Client invoice',
        locator: 'https://example.com/inv',
        hash: 'abcd',
        capturedAt: '2026-09-30T15:00:00.000Z',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        notes: 'Signed'
      };
      expect(validateEvidenceLink(valid).success).toBe(true);
    });

    it('rejects invalid kind', () => {
      const invalid = {
        id: 'ev-1',
        kind: 'INVALID_KIND',
        reference: 'Ref',
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });

    it('rejects missing reference', () => {
      const invalid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });

    it('rejects missing description', () => {
      const invalid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Ref',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });

    it('rejects empty provenanceRefs', () => {
      const invalid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Ref',
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: []
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });

    it('rejects empty string in provenanceRefs', () => {
      const invalid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Ref',
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['']
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });

    it('rejects empty locator, hash, notes', () => {
      const buildInvalid = (override: any) => ({
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Ref',
        description: 'Desc',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1'],
        ...override
      });

      expect(validateEvidenceLink(buildInvalid({ locator: '' })).success).toBe(false);
      expect(validateEvidenceLink(buildInvalid({ hash: '' })).success).toBe(false);
      expect(validateEvidenceLink(buildInvalid({ notes: '' })).success).toBe(false);
    });

    it('validates ISO capturedAt', () => {
      const valid = {
        id: 'ev-1',
        kind: EvidenceKindEnum.DOCUMENT,
        reference: 'Ref',
        description: 'Desc',
        capturedAt: '2026-09-30T15:00:00.000Z',
        epistemicStatus: EpistemicStatusEnum.OBSERVED,
        provenanceRefs: ['ref-1']
      };
      expect(validateEvidenceLink(valid).success).toBe(true);
      
      const invalid = {
        ...valid,
        capturedAt: '2026-09-30'
      };
      expect(validateEvidenceLink(invalid).success).toBe(false);
    });
  });
});
