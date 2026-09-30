import { z } from 'zod';

export enum EpistemicStatusEnum {
  OBSERVED = 'OBSERVED',
  DERIVED = 'DERIVED',
  ASSUMED = 'ASSUMED',
  UNKNOWN = 'UNKNOWN'
}

export const EpistemicStatusSchema = z.nativeEnum(EpistemicStatusEnum);

export const ProvenanceSchema = z.object({
  id: z.string().min(1),
  sourceType: z.string().min(1),
  reference: z.string().min(1),
  originator: z.string().optional(),
  recordedAt: z.string().datetime(),
  hash: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema,
  notes: z.string().optional()
});

export type Provenance = z.infer<typeof ProvenanceSchema>;
