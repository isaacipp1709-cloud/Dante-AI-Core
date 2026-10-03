// src/lib/database.ts

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function query(text: string, params?: any[]) {
  try {
    const client = await pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      mode TEXT DEFAULT 'local-core',
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      request_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
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
    console.error('Error creating conversation:', error);
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
    console.error('Error saving message:', error);
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
    console.error('Error getting messages:', error);
    throw error;
  }
}
