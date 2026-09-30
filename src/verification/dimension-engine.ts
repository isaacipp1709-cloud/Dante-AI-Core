import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export enum DimensionKindEnum {
  CURRENCY = 'CURRENCY',
  DURATION = 'DURATION',
  RATE = 'RATE',
  COUNT = 'COUNT',
  DIMENSIONLESS = 'DIMENSIONLESS',
  UNKNOWN = 'UNKNOWN'
}

export enum UnitOperationEnum {
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  COMPARE = 'COMPARE',
  ASSIGN = 'ASSIGN'
}

export const UnitDefinitionSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  dimension: z.nativeEnum(DimensionKindEnum),
  description: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1),
  notes: z.string().optional()
});

export type UnitDefinition = z.infer<typeof UnitDefinitionSchema>;

export const UnitCompatibilityRuleSchema = z.object({
  leftUnitId: z.string().min(1),
  rightUnitId: z.string().min(1),
  operation: z.nativeEnum(UnitOperationEnum),
  compatible: z.boolean(),
  reason: z.string().min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1)
});

export type UnitCompatibilityRule = z.infer<typeof UnitCompatibilityRuleSchema>;

export function validateUnitDefinition(input: unknown) {
  return UnitDefinitionSchema.safeParse(input);
}

export function validateUnitCompatibilityRule(input: unknown) {
  return UnitCompatibilityRuleSchema.safeParse(input);
}
