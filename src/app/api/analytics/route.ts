import { NextRequest, NextResponse } from 'next/server';
import { query, sanitizeDatabaseError } from '../../../lib/database';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.DANTE_CORE_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (process.env.USE_DATABASE !== 'true') {
    return NextResponse.json({ error: 'DATABASE_DISABLED' }, { status: 400 });
  }

  try {
    const convResult = await query('SELECT COUNT(*) as count FROM conversations');
    const msgResult = await query('SELECT COUNT(*) as count FROM messages');
    
    const analytics = {
      totalConversations: parseInt(convResult.rows[0].count, 10),
      totalMessages: parseInt(msgResult.rows[0].count, 10),
      // Real measured average latency: 0 indicates unmeasured in current persistent store
      averageLatencyMs: 0,
    };
    
    return NextResponse.json(analytics, { status: 200 });
  } catch (error) {
    console.error('Analytics error:', sanitizeDatabaseError(error));
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
