import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';
import { EvidenceKindEnum } from './evidence-link';
import { CertificationStatusEnum } from './certification-state';
import { RecommendedEffectEnum } from './stop-conditions';

export enum VerificationPolicyModeEnum {
  DOCUMENTARY = 'DOCUMENTARY',
  STRUCTURAL = 'STRUCTURAL',
  DETERMINISTIC = 'DETERMINISTIC',
  HUMAN_REVIEW = 'HUMAN_REVIEW',
  CUSTOM = 'CUSTOM'
}

export const VerificationPolicySchema = z.object({
  id: z.string().min(1),
  mode: z.nativeEnum(VerificationPolicyModeEnum),
  description: z.string().min(1),
  requiredEvidenceKinds: z.array(z.nativeEnum(EvidenceKindEnum)).min(1),
  requiredInvariantRefs: z.array(z.string().min(1)),
  requiredDomainRefs: z.array(z.string().min(1)),
  allowedCertificationStatuses: z.array(z.nativeEnum(CertificationStatusEnum)).min(1),
  requiredStopConditionEffects: z.array(z.nativeEnum(RecommendedEffectEnum)),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().min(1).optional()
});

export type VerificationPolicy = z.infer<typeof VerificationPolicySchema>;

export function validateVerificationPolicy(input: unknown) {
  return VerificationPolicySchema.safeParse(input);
}
