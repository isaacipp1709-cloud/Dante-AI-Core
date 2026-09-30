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

export const AttestationSchema = z.object({
  attestationId: z.string().min(1),
  attestorId: z.string().min(1),
  attestedAt: z.string().datetime(),
  signature: z.string().min(1).optional()
});

export const CustodyTransferSchema = z.object({
  handlerId: z.string().min(1),
  transferredAt: z.string().datetime(),
  action: z.string().min(1),
  notes: z.string().min(1).optional()
});

export const CustodyChainSchema = z.object({
  chainId: z.string().min(1),
  transfers: z.array(CustodyTransferSchema).min(1)
});

export const ExtendedProvenanceSchema = ProvenanceSchema.extend({
  attestations: z.array(AttestationSchema),
  custodyChains: z.array(CustodyChainSchema),
  provenanceRefs: z.array(z.string().min(1)).min(1)
});

export type ExtendedProvenance = z.infer<typeof ExtendedProvenanceSchema>;

export const validateExtendedProvenance = (input: unknown) => ExtendedProvenanceSchema.safeParse(input);
