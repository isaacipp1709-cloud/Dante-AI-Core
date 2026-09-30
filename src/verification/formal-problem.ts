import { z } from 'zod';
import { EpistemicStatusSchema } from './provenance';
import { UncertaintySchema } from './uncertainty';

export const ProblemVariableSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  domainRef: z.string().optional(),
  epistemicStatus: EpistemicStatusSchema,
  provenanceRefs: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  notes: z.string().optional()
});

export type ProblemVariable = z.infer<typeof ProblemVariableSchema>;

export const FormalProblemSchema = z.object({
  id: z.string().min(1),
  variables: z.array(ProblemVariableSchema).nonempty(),
  units: z.record(z.string(), z.string()),
  domains: z.record(z.string(), z.string()),
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  objective: z.string().min(1),
  temporalScope: z.string().min(1),
  provenanceRefs: z.array(z.string()),
  uncertainties: z.array(UncertaintySchema)
});

export type FormalProblem = z.infer<typeof FormalProblemSchema>;
