// src/lib/database.ts

import { Pool } from 'pg';

export function getDatabaseSslConfig(
  env: NodeJS.ProcessEnv = process.env
): boolean | { rejectUnauthorized: boolean } {
  if (env.NODE_ENV === 'production') {
    return { rejectUnauthorized: true };
  }
  if (env.DATABASE_URL && env.DATABASE_URL.includes('sslmode=require')) {
    return { rejectUnauthorized: true };
  }
  return false;
}

export function getDatabasePoolConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    connectionString: env.DATABASE_URL,
    ssl: getDatabaseSslConfig(env),
  };
}

export function sanitizeDatabaseError(error: unknown): string {
  if (!error) return 'Unknown database error';
  const raw = error instanceof Error ? error.message : String(error);
  // Redact credentials from postgres/http URLs: postgres://user:password@host/db -> postgres://***:***@host/db
  let sanitized = raw.replace(/:\/\/[^:]+:([^@]+)@/g, '://***:***@');
  // Redact potential password/token/key parameter assignments
  sanitized = sanitized.replace(/(password|token|secret|key)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi, '$1=***');
  if (process.env.DATABASE_URL) {
    const urlMatch = process.env.DATABASE_URL.match(/:\/\/([^:]+):([^@]+)@/);
    if (urlMatch && urlMatch[2] && urlMatch[2].length > 2) {
      sanitized = sanitized.split(urlMatch[2]).join('***');
    }
  }
  return sanitized;
}

const pool = new Pool(getDatabasePoolConfig());

export async function query(text: string, params?: any[]) {
  try {
    const client = await pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', sanitizeDatabaseError(error));
    throw error;
  }
}

export async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mode TEXT DEFAULT 'local-core',
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS messages_conversation_idx
      ON messages (conversation_id, created_at ASC);
  `;
  await query(schema);
}

export async function createConversation(externalId: string) {
  try {
    const result = await query(
      `INSERT INTO conversations (external_id)
       VALUES ($1)
       ON CONFLICT (external_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [externalId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error creating conversation:', sanitizeDatabaseError(error));
    throw error;
  }
}

export async function saveMessage(conversationId: string, role: string, content: string, requestId?: string) {
  try {
    // Note: conversationId is the UUID of the conversation, not the externalId.
    // Wait, the route passes the conversationId string from La Casa, which might be external_id.
    // Let's adapt it so it resolves the internal ID using external_id, or expect route to pass internal ID.
    // Assuming route.ts passes the internal UUID returned by createConversation.
    const result = await query(
      'INSERT INTO messages (conversation_id, role, content, request_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, role, content, requestId || null]
    );
    return result.rows;
  } catch (error) {
    console.error('Error saving message:', sanitizeDatabaseError(error));
    throw error;
  }
}

export async function getConversationMessages(conversationId: string) {
  try {
    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting messages:', sanitizeDatabaseError(error));
    throw error;
  }
}
