import { z } from 'zod';

export const GeneralContextSchema = z.object({
  timezone: z.string().default('UTC'),
  locale: z.string().default('es-CL'),
  userId: z.string().uuid().optional(),
  capabilities: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
});

export type GeneralContext = z.infer<typeof GeneralContextSchema>;
