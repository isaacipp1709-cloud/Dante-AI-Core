import { NextResponse } from 'next/server';
import { ProviderToggleRequestSchema } from '../../../../../contracts/connections';
import { query } from '../../../../../lib/database';
import { requireCoreToken } from '../../../../../lib/core-auth';
import {
  collectConnectionStatus,
  probeDatabase,
} from '../../../../../orchestrator/connections/connection-status';
import { getProviderSettingsStore } from '../../../../../orchestrator/connections/provider-settings-store';
import { providerRouter } from '../../../../../orchestrator/provider-router';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Payload JSON invalido.' } },
      { status: 400 },
    );
  }

  const parsed = ProviderToggleRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'providerId y enabled son requeridos.' } },
      { status: 400 },
    );
  }

  const { providerId, enabled } = parsed.data;

  // Solo se permite alternar proveedores ejecutables por el Core.
  if (!providerRouter.hasProvider(providerId)) {
    return NextResponse.json(
      { error: { code: 'PROVIDER_NOT_SUPPORTED', message: 'Proveedor no disponible en el Core.' } },
      { status: 404 },
    );
  }

  const store = getProviderSettingsStore({
    env: process.env,
    runSql: (text, params) => query(text, params as unknown[] | undefined),
  });

  try {
    await store.setEnabled(providerId, enabled);
  } catch {
    return NextResponse.json(
      { error: { code: 'STORAGE_ERROR', message: 'No fue posible guardar el estado del proveedor.' } },
      { status: 503 },
    );
  }

  // Efecto inmediato en el enrutador (no toca credenciales).
  providerRouter.setProviderEnabled(providerId, enabled);

  const status = await collectConnectionStatus({
    env: process.env,
    store,
    probeDatabase: () => probeDatabase(() => query('SELECT 1')),
  });

  return NextResponse.json(status, { status: 200 });
}
