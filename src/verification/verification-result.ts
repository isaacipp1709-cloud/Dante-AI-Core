import { z } from 'zod';
import { StopConditionSchema } from './stop-conditions';
import { UncertaintySchema } from './uncertainty';

export enum VerificationStatusEnum {
  PASS = 'PASS',
  FAIL = 'FAIL',
  INCONCLUSIVE = 'INCONCLUSIVE',
  BLOCKED = 'BLOCKED'
}

export const VerificationResultSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(VerificationStatusEnum),
  summary: z.string().min(1),
  findings: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  appliedConstraints: z.array(z.string()),
  warnings: z.array(z.string()),
  stopConditions: z.array(StopConditionSchema),
  recordedAt: z.string().datetime(),
  provenanceRefs: z.array(z.string()),
  uncertainties: z.array(UncertaintySchema)
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;
