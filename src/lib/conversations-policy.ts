/**
 * Interruptor de operaciones de conversaciones.
 *
 * Reversion SEGURA: si algo falla no se vuelve a una version que ignora
 * owner_id (eso restauraria consultas globales). Se SUSPENDEN de forma
 * explicita las operaciones afectadas hasta corregir, conservando datos,
 * columnas, guardas y aislamiento.
 *
 * DANTE_CONVERSATIONS_ENABLED: 'true' habilita; ausente o distinto => suspendido.
 */
export const CONVERSATIONS_ENABLED_ENV = 'DANTE_CONVERSATIONS_ENABLED';

export function isConversationsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CONVERSATIONS_ENABLED_ENV] === 'true';
}

export function conversationsSuspendedBody(): { error: { code: string; message: string } } {
  return {
    error: {
      code: 'CONVERSATIONS_SUSPENDED',
      message: 'Las operaciones de conversaciones estan suspendidas temporalmente.',
    },
  };
}
