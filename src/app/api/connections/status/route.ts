import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { requireCoreToken } from '../../../../lib/core-auth';
import {
  collectConnectionStatus,
  probeDatabase,
} from '../../../../orchestrator/connections/connection-status';
import { getProviderSettingsStore } from '../../../../orchestrator/connections/provider-settings-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const store = getProviderSettingsStore({
    env: process.env,
    runSql: (text, params) => query(text, params as unknown[] | undefined),
  });

  const status = await collectConnectionStatus({
    env: process.env,
    store,
    probeDatabase: () => probeDatabase(() => query('SELECT 1')),
  });

  return NextResponse.json(status, { status: 200 });
}
