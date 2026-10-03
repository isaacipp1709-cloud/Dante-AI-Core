import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

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
    const result = await query('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 50');
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('Conversations error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
