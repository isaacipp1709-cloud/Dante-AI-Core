/**
 * Acceso a conversaciones SIEMPRE acotado al propietario verificado.
 * - Sin propietario no hay consulta: nunca se cae a listados globales.
 * - Un external_id existente de otro propietario NO se reutiliza ni reasigna.
 * - Los registros historicos (owner_id NULL) quedan inaccesibles desde aqui.
 */

export interface ConversationRow {
  id: string;
  external_id: string;
  owner_id: string | null;
  updated_at?: string;
}

export interface SqlResultLike {
  rows: Array<Record<string, unknown>>;
  rowCount?: number | null;
}

export type ConversationSqlRunner = (text: string, params?: unknown[]) => Promise<SqlResultLike>;

export class ConversationOwnershipError extends Error {
  constructor(message = 'Conversation not accessible') {
    super(message);
    this.name = 'ConversationOwnershipError';
  }
}

export const CONVERSATION_TABLE = 'conversations';

/**
 * Crea o recupera la conversacion del propietario.
 * ON CONFLICT DO NOTHING evita reasignar la conversacion de otro usuario:
 * si el external_id ya existe con otro dueno, se falla cerrado.
 */
export async function ensureConversationForOwner(
  run: ConversationSqlRunner,
  externalId: string,
  ownerId: string,
): Promise<string> {
  await run(
    `INSERT INTO ${CONVERSATION_TABLE} (external_id, owner_id)
     VALUES ($1, $2)
     ON CONFLICT (external_id) DO NOTHING`,
    [externalId, ownerId],
  );

  const found = await run(
    `SELECT id, owner_id FROM ${CONVERSATION_TABLE} WHERE external_id = $1 LIMIT 1`,
    [externalId],
  );

  const row = found.rows[0];
  if (!row || typeof row.id !== 'string' || row.owner_id !== ownerId) {
    // Colision con otra identidad o registro historico sin dueno: no se toma.
    throw new ConversationOwnershipError();
  }
  return row.id;
}

export async function listConversationsForOwner(
  run: ConversationSqlRunner,
  ownerId: string,
): Promise<ConversationRow[]> {
  const result = await run(
    `SELECT id, external_id, owner_id, updated_at FROM ${CONVERSATION_TABLE}
     WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 50`,
    [ownerId],
  );
  return result.rows.filter((row) => row.owner_id === ownerId) as unknown as ConversationRow[];
}

export async function listMessagesForOwner(
  run: ConversationSqlRunner,
  externalId: string,
  ownerId: string,
): Promise<Array<Record<string, unknown>>> {
  const conversation = await run(
    `SELECT id FROM ${CONVERSATION_TABLE} WHERE external_id = $1 AND owner_id = $2 LIMIT 1`,
    [externalId, ownerId],
  );
  const row = conversation.rows[0];
  if (!row || typeof row.id !== 'string') return []; // Historico o ajeno: inaccesible

  const messages = await run(
    'SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [row.id],
  );
  return messages.rows;
}

export async function appendMessageForOwner(
  run: ConversationSqlRunner,
  externalId: string,
  ownerId: string,
  role: string,
  content: string,
  requestId?: string,
): Promise<void> {
  const internalId = await ensureConversationForOwner(run, externalId, ownerId);
  await run(
    'INSERT INTO messages (conversation_id, role, content, request_id) VALUES ($1, $2, $3, $4)',
    [internalId, role, content, requestId ?? null],
  );
}

/**
 * Verificacion PREVIA al proveedor: si el external_id ya existe y pertenece a
 * otro propietario (o es historico sin dueno), se rechaza sin consumir proveedor
 * y sin crear ni reasignar nada. Si no existe todavia, se permite: se creara al
 * guardar, ya con el propietario verificado.
 */
export async function assertConversationAccess(
  run: ConversationSqlRunner,
  externalId: string,
  ownerId: string,
): Promise<void> {
  const found = await run(
    `SELECT id, owner_id FROM ${CONVERSATION_TABLE} WHERE external_id = $1 LIMIT 1`,
    [externalId],
  );
  const row = found.rows[0];
  if (!row) return;
  if (row.owner_id !== ownerId) {
    // Ajena o historica (owner_id NULL): nunca se accede ni se toma.
    throw new ConversationOwnershipError();
  }
}
