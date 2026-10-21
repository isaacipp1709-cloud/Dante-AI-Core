/**
 * Interruptor de operaciones de conversaciones.
 *
 * Reversion SEGURA: si algo falla no se vuelve a una version que ignora
 * owner_id (eso restauraria consultas globales). Se SUSPENDEN de forma
 * explicita las operaciones afectadas hasta corregir, conservando datos,
 * columnas, guardas y aislamiento.
 *
 * DANTE_CONVERSATIONS_ENABLED: 'true' habilita; 'false' suspende;
 * Si USE_DATABASE === 'true' y no está suspendido explícitamente, se habilita por defecto.
 */
export const CONVERSATIONS_ENABLED_ENV = 'DANTE_CONVERSATIONS_ENABLED';

export function isConversationsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env[CONVERSATIONS_ENABLED_ENV] === 'false') return false;
  return env[CONVERSATIONS_ENABLED_ENV] === 'true' || env.USE_DATABASE === 'true';
}

export function conversationsSuspendedBody(): { error: { code: string; message: string } } {
  return {
    error: {
      code: 'CONVERSATIONS_SUSPENDED',
      message: 'Las operaciones de conversaciones estan suspendidas temporalmente.',
    },
  };
}
