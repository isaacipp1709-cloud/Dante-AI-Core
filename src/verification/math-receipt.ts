import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';
import { UncertaintySchema } from './uncertainty';

export const MathReceiptInputSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema
});

export type MathReceiptInput = z.infer<typeof MathReceiptInputSchema>;

export const MathReceiptOutputSchema = z.object({
  value: z.string().min(1),
  unit: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema
});

export type MathReceiptOutput = z.infer<typeof MathReceiptOutputSchema>;

export const MathReceiptSchema = z.object({
  id: z.string().min(1),
  method: z.string().min(1),
  inputs: z.array(MathReceiptInputSchema).nonempty(),
  output: MathReceiptOutputSchema,
  precisionOrRoundingRule: z.string().min(1),
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  provenanceRefs: z.array(z.string()),
  uncertainties: z.array(UncertaintySchema),
  recordedAt: z.string().datetime()
});

export type MathReceipt = z.infer<typeof MathReceiptSchema>;

export enum PrecisionModeEnum {
  TRUNCATE = 'TRUNCATE',
  ROUND_HALF_UP = 'ROUND_HALF_UP',
  ROUND_HALF_EVEN = 'ROUND_HALF_EVEN',
  EXACT = 'EXACT'
}

export const PrecisionRuleSchema = z.object({
  mode: z.nativeEnum(PrecisionModeEnum),
  precisionSpec: z.string().min(1).optional(),
  tolerance: z.string().min(1).optional()
});

export const CompoundTraceSchema = z.object({
  traceId: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  intermediateValues: z.array(z.string().min(1))
});

export const ExtendedMathReceiptSchema = MathReceiptSchema.extend({
  precisionRule: PrecisionRuleSchema,
  compoundTraces: z.array(CompoundTraceSchema),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1)
});

export type ExtendedMathReceipt = z.infer<typeof ExtendedMathReceiptSchema>;

export const validateExtendedMathReceipt = (input: unknown) => ExtendedMathReceiptSchema.safeParse(input);
