import { z } from 'zod';

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
