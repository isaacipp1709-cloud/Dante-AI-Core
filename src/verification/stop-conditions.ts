import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum StopConditionCodeEnum {
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  MISSING_UNIT = 'MISSING_UNIT',
  INVALID_DOMAIN = 'INVALID_DOMAIN',
  UNDECLARED_CRITICAL_ASSUMPTION = 'UNDECLARED_CRITICAL_ASSUMPTION',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  UNBOUNDED_UNCERTAINTY = 'UNBOUNDED_UNCERTAINTY',
  MISSING_PROVENANCE = 'MISSING_PROVENANCE',
  EVIDENCE_CONFLICT = 'EVIDENCE_CONFLICT',
  ENGINE_UNAVAILABLE = 'ENGINE_UNAVAILABLE',
  SECURITY_POLICY = 'SECURITY_POLICY'
}

export enum StopConditionSeverityEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum RecommendedEffectEnum {
  CONTINUE = 'CONTINUE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  BLOCKED = 'BLOCKED'
}

export const StopConditionSchema = z.object({
  code: z.nativeEnum(StopConditionCodeEnum),
  severity: z.nativeEnum(StopConditionSeverityEnum),
  description: z.string().min(1),
  recommendedEffect: z.nativeEnum(RecommendedEffectEnum),
  reference: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema
});

export type StopCondition = z.infer<typeof StopConditionSchema>;
