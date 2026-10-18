import {
  ConversationOwnershipError,
  appendMessageForOwner,
  ensureConversationForOwner,
  listConversationsForOwner,
  listMessagesForOwner,
} from '../../src/lib/conversations-repository';

interface Row { id: string; external_id: string; owner_id: string | null; updated_at?: string }

function fakeDb(rows: Row[] = []) {
  const messages: Array<{ conversation_id: string; role: string; content: string; request_id?: string }> = [];
  const run = async (text: string, params?: unknown[]) => {
    if (text.startsWith('INSERT INTO conversations')) {
      const [externalId, ownerId] = params as [string, string];
      if (!rows.some((r) => r.external_id === externalId)) {
        rows.push({ id: 'conv-' + rows.length, external_id: externalId, owner_id: ownerId, updated_at: 'now' });
      }
      return { rows: [], rowCount: 1 };
    }
    if (text.includes('WHERE owner_id = $1') && (params?.length ?? 0) === 1) {
      // listado: WHERE owner_id = $1
      const [ownerId] = params as [string];
      return { rows: rows.filter((r) => r.owner_id === ownerId) };
    }
    if (text.includes('external_id = $1 AND owner_id = $2')) {
      const [externalId, ownerId] = params as [string, string];
      return { rows: rows.filter((r) => r.external_id === externalId && r.owner_id === ownerId).slice(0, 1) };
    }
    if (text.includes('FROM conversations')) {
      const [externalId] = params as [string];
      return { rows: rows.filter((r) => r.external_id === externalId).slice(0, 1) };
    }
    if (text.startsWith('INSERT INTO messages')) {
      const [conversationId, role, content, requestId] = params as [string, string, string, string?];
      messages.push({ conversation_id: conversationId, role, content, request_id: requestId });
      return { rows: [], rowCount: 1 };
    }
    if (text.includes('FROM messages')) {
      const [conversationId] = params as [string];
      return { rows: messages.filter((m) => m.conversation_id === conversationId) };
    }
    return { rows: [] };
  };
  return { rows, messages, run };
}

describe('Conversaciones acotadas al propietario', () => {
  it('crea y recupera la conversacion del propietario', async () => {
    const db = fakeDb();
    const id = await ensureConversationForOwner(db.run, 'conv-externa-1', 'user-a');
    expect(id).toBe('conv-0');
    expect(await ensureConversationForOwner(db.run, 'conv-externa-1', 'user-a')).toBe('conv-0');
  });

  it('7. colision de external_id: no permite tomar propiedad ajena', async () => {
    const db = fakeDb([{ id: 'conv-a', external_id: 'compartida', owner_id: 'user-a' }]);
    await expect(ensureConversationForOwner(db.run, 'compartida', 'user-b')).rejects.toThrow(ConversationOwnershipError);
    // El dueno original conserva la conversacion
    const rowsA = await listConversationsForOwner(db.run, 'user-a');
    expect(rowsA.map((r) => r.id)).toEqual(['conv-a']);
    expect(db.messages).toHaveLength(0);
  });

  it('6. usuario B no lista, lee ni escribe conversaciones de A', async () => {
    const db = fakeDb([{ id: 'conv-a', external_id: 'de-a', owner_id: 'user-a' }]);
    await appendMessageForOwner(db.run, 'de-a', 'user-a', 'user', 'hola');

    expect(await listConversationsForOwner(db.run, 'user-b')).toEqual([]);
    expect(await listMessagesForOwner(db.run, 'de-a', 'user-b')).toEqual([]);
    await expect(appendMessageForOwner(db.run, 'de-a', 'user-b', 'user', 'intruso')).rejects.toThrow(ConversationOwnershipError);
    expect(db.messages).toHaveLength(1);
  });

  it('8. historico sin propietario queda inaccesible', async () => {
    const db = fakeDb([{ id: 'conv-h', external_id: 'historica', owner_id: null }]);
    expect(await listConversationsForOwner(db.run, 'user-a')).toEqual([]);
    expect(await listMessagesForOwner(db.run, 'historica', 'user-a')).toEqual([]);
    await expect(ensureConversationForOwner(db.run, 'historica', 'user-a')).rejects.toThrow(ConversationOwnershipError);
  });

  it('9. error de base se propaga (fallo cerrado, sin acceso global)', async () => {
    const failing = async () => { throw new Error('relation "conversations" does not exist'); };
    await expect(listConversationsForOwner(failing, 'user-a')).rejects.toThrow();
    await expect(listMessagesForOwner(failing, 'x', 'user-a')).rejects.toThrow();
  });

  it('el historial propio se devuelve solo al dueno', async () => {
    const db = fakeDb([{ id: 'conv-a', external_id: 'mia', owner_id: 'user-a' }]);
    await appendMessageForOwner(db.run, 'mia', 'user-a', 'user', 'hola');
    const own = await listMessagesForOwner(db.run, 'mia', 'user-a');
    expect(own).toHaveLength(1);
    expect(own[0].content).toBe('hola');
  });
});
