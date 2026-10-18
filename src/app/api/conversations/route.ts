import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { requireCoreToken } from '../../../lib/core-auth';
import { OWNER_ASSERTION_HEADER, verifyOwnerAssertion } from '../../../lib/owner-assertion';
import { listConversationsForOwner } from '../../../lib/conversations-repository';

import { conversationsSuspendedBody, isConversationsEnabled } from '../../../lib/conversations-policy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Reversion segura: operaciones suspendidas de forma explicita.
  if (!isConversationsEnabled()) {
    return NextResponse.json(conversationsSuspendedBody(), { status: 503 });
  }

  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const assertion = verifyOwnerAssertion({
    assertion: request.headers.get(OWNER_ASSERTION_HEADER),
    secret: process.env.DANTE_CORE_TOKEN,
  });
  if (!assertion.ok) {
    return NextResponse.json({ error: { code: assertion.code, message: assertion.message } }, { status: assertion.status });
  }

  if (process.env.USE_DATABASE !== 'true') {
    return NextResponse.json({ error: { code: 'DATABASE_DISABLED', message: 'Persistencia no habilitada.' } }, { status: 400 });
  }

  try {
    const run = (text: string, params?: unknown[]) => query(text, params as unknown[] | undefined);
    return NextResponse.json(await listConversationsForOwner(run, assertion.ownerId), { status: 200 });
  } catch {
    // Fallo cerrado: sin listados globales ni datos de otros usuarios.
    return NextResponse.json(
      { error: { code: 'STORAGE_ERROR', message: 'No fue posible consultar tus conversaciones.' } },
      { status: 503 },
    );
  }
}
