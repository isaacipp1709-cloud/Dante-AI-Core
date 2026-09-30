import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum CertificationStatusEnum {
  NOT_ASSESSED = 'NOT_ASSESSED',
  EVIDENCE_INCOMPLETE = 'EVIDENCE_INCOMPLETE',
  CONDITIONS_UNMET = 'CONDITIONS_UNMET',
  CONDITIONALLY_SUPPORTED = 'CONDITIONALLY_SUPPORTED',
  BLOCKED = 'BLOCKED'
}

export const CertificationStateSchema = z.object({
  id: z.string().min(1),
  formalProblemId: z.string().min(1),
  status: z.nativeEnum(CertificationStatusEnum),
  basis: z.string().min(1),
  verificationResultRefs: z.array(z.string().min(1)).min(1),
  mathReceiptRefs: z.array(z.string().min(1)),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  uncertaintyRefs: z.array(z.string().min(1)),
  stopConditionRefs: z.array(z.string().min(1)),
  conditions: z.array(z.string().min(1)).min(1),
  limitations: z.array(z.string().min(1)).min(1),
  epistemicStatus: EpistemicStatusSchema,
  recordedAt: z.string().datetime(),
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().min(1).optional()
});

export type CertificationState = z.infer<typeof CertificationStateSchema>;

export function validateCertificationState(input: unknown) {
  return CertificationStateSchema.safeParse(input);
}
