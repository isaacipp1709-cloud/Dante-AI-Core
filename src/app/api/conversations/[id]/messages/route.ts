import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.DANTE_CORE_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get the internal conversation ID from the external ID
    const convResult = await query(
      'SELECT id FROM conversations WHERE external_id = $1',
      [id]
    );

    if (convResult.rows.length === 0) {
      return NextResponse.json([], { status: 200 }); // No conversation yet
    }

    const internalId = convResult.rows[0].id;

    // Fetch the last 20 messages for this conversation
    const msgResult = await query(
      `SELECT role, content, timestamp 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 20`,
      [internalId]
    );

    // Messages are fetched DESC, so we reverse them to return in chronological order
    const messages = msgResult.rows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      timestamp: row.timestamp
    }));

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
