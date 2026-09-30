import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum InvariantSeverityEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum InvariantKindEnum {
  RELATIONSHIP = 'RELATIONSHIP',
  CONSERVATION = 'CONSERVATION',
  BOUNDARY = 'BOUNDARY',
  POLICY = 'POLICY',
  CUSTOM = 'CUSTOM'
}

export const InvariantDefinitionSchema = z.object({
  id: z.string().min(1),
  kind: z.nativeEnum(InvariantKindEnum),
  severity: z.nativeEnum(InvariantSeverityEnum),
  description: z.string().min(1),
  expression: z.string().min(1),
  variableRefs: z.array(z.string().min(1)).min(1),
  unitRefs: z.array(z.string().min(1)).min(1),
  domainRefs: z.array(z.string().min(1)).min(1),
  constraintRefs: z.array(z.string().min(1)).min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().optional()
});

export type InvariantDefinition = z.infer<typeof InvariantDefinitionSchema>;

export const InvariantBindingSchema = z.object({
  invariantId: z.string().min(1),
  formalProblemId: z.string().min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().optional()
});

export type InvariantBinding = z.infer<typeof InvariantBindingSchema>;

export function validateInvariantDefinition(input: unknown) {
  return InvariantDefinitionSchema.safeParse(input);
}

export function validateInvariantBinding(input: unknown) {
  return InvariantBindingSchema.safeParse(input);
}
