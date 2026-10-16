import { z } from 'zod';

/**
 * Contrato del modelo central de conexiones de Dante.
 * No transporta claves, tokens ni URLs internas: solo estado y metadatos.
 */

export const ConnectionTypeSchema = z.enum([
  'database',
  'auth',
  'ai_provider',
  'bridge',
  'integration',
]);

export const ConnectionStatusSchema = z.enum([
  'active',
  'incomplete',
  'disabled',
  'not_configured',
]);

export const ConnectionOwnerSchema = z.enum(['system', 'user']);

/** Origen de la credencial que habilita la conexion (nunca su valor). */
export const CredentialSourceSchema = z.enum(['system', 'byok', 'none']);

export const ConnectionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  type: ConnectionTypeSchema,
  status: ConnectionStatusSchema,
  owner: ConnectionOwnerSchema,
  canToggle: z.boolean(),
  credentialSource: CredentialSourceSchema,
  detail: z.string().max(200).optional(),
});

export const ConnectionsStatusResponseSchema = z.object({
  generatedAt: z.string().min(1),
  storage: z.enum(['durable', 'temporary']),
  connections: z.array(ConnectionSchema),
});

export const ProviderToggleRequestSchema = z.object({
  providerId: z.string().min(1).max(64),
  enabled: z.boolean(),
});

/** Subconjunto seguro para agentes: solo conexiones activas, sin detalles internos. */
export const AgentConnectionsResponseSchema = z.object({
  generatedAt: z.string().min(1),
  connections: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      type: ConnectionTypeSchema,
      owner: ConnectionOwnerSchema,
      status: z.literal('active'),
    }),
  ),
});

export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type ConnectionOwner = z.infer<typeof ConnectionOwnerSchema>;
export type CredentialSource = z.infer<typeof CredentialSourceSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type ConnectionsStatusResponse = z.infer<typeof ConnectionsStatusResponseSchema>;
export type ProviderToggleRequest = z.infer<typeof ProviderToggleRequestSchema>;
export type AgentConnectionsResponse = z.infer<typeof AgentConnectionsResponseSchema>;
