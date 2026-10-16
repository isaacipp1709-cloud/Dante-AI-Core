import { NextResponse } from 'next/server';
import { AgentConnectionsResponseSchema } from '../../../../contracts/connections';
import { query } from '../../../../lib/database';
import { requireCoreToken } from '../../../../lib/core-auth';
import {
  collectConnectionStatus,
  probeDatabase,
} from '../../../../orchestrator/connections/connection-status';
import { getProviderSettingsStore } from '../../../../orchestrator/connections/provider-settings-store';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para agentes (Dante/Aikor): solo conexiones ACTIVAS y seguras.
 * Sin claves, tokens, URLs internas ni detalles de configuracion.
 */
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

  const payload = {
    generatedAt: status.generatedAt,
    connections: status.connections
      .filter((connection) => connection.status === 'active')
      .map((connection) => ({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        owner: connection.owner,
        status: 'active' as const,
      })),
  };

  const parsed = AgentConnectionsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Estado de conexiones invalido.' } },
      { status: 500 },
    );
  }

  return NextResponse.json(parsed.data, { status: 200 });
}
