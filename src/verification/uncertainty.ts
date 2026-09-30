import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';

export const UncertaintySchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  range: z.string().optional(),
  unit: z.string().optional(),
  confidenceLevel: z.string().optional(),
  impact: z.string().min(1),
  mitigation: z.string().optional()
});

export type Uncertainty = z.infer<typeof UncertaintySchema>;

export enum UncertaintyTypeEnum {
  MEASUREMENT = 'MEASUREMENT',
  VARIABILITY = 'VARIABILITY',
  ESTIMATION = 'ESTIMATION',
  INCOMPLETENESS = 'INCOMPLETENESS'
}

export const ExtendedUncertaintySchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(UncertaintyTypeEnum),
  description: z.string().min(1),
  lowerBound: z.string().min(1).optional(),
  upperBound: z.string().min(1).optional(),
  confidenceLevel: z.string().min(1).optional(),
  justification: z.string().min(1),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string().min(1)).min(1)
});

export type ExtendedUncertainty = z.infer<typeof ExtendedUncertaintySchema>;

export const validateExtendedUncertainty = (input: unknown) => ExtendedUncertaintySchema.safeParse(input);
