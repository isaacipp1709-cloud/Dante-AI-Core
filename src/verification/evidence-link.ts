import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum EvidenceKindEnum {
  DOCUMENT = 'DOCUMENT',
  DATASET = 'DATASET',
  USER_ATTESTATION = 'USER_ATTESTATION',
  CALCULATION_TRACE = 'CALCULATION_TRACE',
  REGULATION = 'REGULATION',
  EXTERNAL_RESPONSE = 'EXTERNAL_RESPONSE',
  OTHER = 'OTHER'
}

export const EvidenceLinkSchema = z.object({
  id: z.string().min(1),
  kind: z.nativeEnum(EvidenceKindEnum),
  reference: z.string().min(1),
  description: z.string().min(1),
  locator: z.string().min(1).optional(),
  hash: z.string().min(1).optional(),
  capturedAt: z.string().datetime().optional(),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().min(1).optional()
});

export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

export function validateEvidenceLink(input: unknown) {
  return EvidenceLinkSchema.safeParse(input);
}
