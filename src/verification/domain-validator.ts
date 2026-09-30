import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum DomainKindEnum {
  NUMERIC = 'NUMERIC',
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  TEXT = 'TEXT',
  ENUM = 'ENUM',
  DATE = 'DATE',
  CUSTOM = 'CUSTOM'
}

export const DomainDefinitionSchema = z.object({
  id: z.string().min(1),
  kind: z.nativeEnum(DomainKindEnum),
  description: z.string().min(1),
  allowedValues: z.array(z.string().min(1)).optional(),
  pattern: z.string().optional(),
  minimum: z.string().min(1).optional(),
  maximum: z.string().min(1).optional(),
  inclusiveMinimum: z.boolean().optional(),
  inclusiveMaximum: z.boolean().optional(),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.kind === DomainKindEnum.ENUM) {
    if (!data.allowedValues || data.allowedValues.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'allowedValues must exist and have at least one element when kind is ENUM',
        path: ['allowedValues']
      });
    }
  }
});

export type DomainDefinition = z.infer<typeof DomainDefinitionSchema>;

export const DomainBindingSchema = z.object({
  variableId: z.string().min(1),
  domainId: z.string().min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().optional()
});

export type DomainBinding = z.infer<typeof DomainBindingSchema>;

export function validateDomainDefinition(input: unknown) {
  return DomainDefinitionSchema.safeParse(input);
}

export function validateDomainBinding(input: unknown) {
  return DomainBindingSchema.safeParse(input);
}
