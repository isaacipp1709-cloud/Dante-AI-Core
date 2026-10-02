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

export async function saveMessage(conversationId: string, role: string, content: string, tokens?: number) {
  try {
    const result = await query(
      'INSERT INTO messages (conversation_id, role, content, tokens) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, role, content, tokens || null]
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

export async function createConversation(title?: string) {
  try {
    const result = await query(
      'INSERT INTO conversations (title) VALUES ($1) RETURNING *',
      [title || null]
    );
    return result.rows;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}
