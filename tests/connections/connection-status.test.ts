import {
  buildConnectionStatus,
  collectConnectionStatus,
  probeDatabase,
  CORE_PROVIDER_CATALOGUE,
} from '../../src/orchestrator/connections/connection-status';
import {
  InMemoryProviderSettingsStore,
  PostgresProviderSettingsStore,
  getConnectionStorageMode,
  getProviderSettingsStore,
  isDatabaseConfigured,
} from '../../src/orchestrator/connections/provider-settings-store';
import { ConnectionsStatusResponseSchema } from '../../src/contracts/connections';
import { requireCoreToken } from '../../src/lib/core-auth';
import { ProviderRouter } from '../../src/orchestrator/provider-router';

const FAKE_DB_URL = 'postgres://user:super-secret-password@db.internal:5432/neon';
const FAKE_GEMINI_KEY = 'AIza-fake-key-value-0001';

function envWith(extra: Record<string, string | undefined>): Record<string, string | undefined> {
  return { ...extra };
}

describe('Modelo central de conexiones (Core)', () => {
  it('1. reporta estado real cuando el Core esta disponible', async () => {
    const env = envWith({
      DATABASE_URL: FAKE_DB_URL,
      DANTE_CORE_TOKEN: 'token-value',
      GOOGLE_AI_API_KEY: FAKE_GEMINI_KEY,
    });
    const store = new InMemoryProviderSettingsStore();

    const status = await collectConnectionStatus({
      env,
      store,
      probeDatabase: async () => true,
      now: () => new Date('2026-10-16T00:00:00.000Z'),
    });

    expect(ConnectionsStatusResponseSchema.safeParse(status).success).toBe(true);
    expect(status.generatedAt).toBe('2026-10-16T00:00:00.000Z');
    expect(status.storage).toBe('durable');

    const byId = new Map(status.connections.map((c) => [c.id, c]));
    expect(byId.get('database.neon')?.status).toBe('active');
    expect(byId.get('core.api')?.status).toBe('active');
    expect(byId.get('ai.gemini')?.status).toBe('active');
    expect(byId.get('ai.gemini')?.credentialSource).toBe('system');
    expect(byId.get('ai.mock')?.status).toBe('active');
    // groq aun no tiene adaptador: incompleto, no "activo"
    expect(byId.get('ai.groq')?.status).toBe('incomplete');
    expect(byId.get('ai.groq')?.canToggle).toBe(false);
  });

  it('2. reporta estado claro cuando falta configuracion', async () => {
    const status = await collectConnectionStatus({
      env: envWith({}),
      store: new InMemoryProviderSettingsStore(),
      probeDatabase: async () => false,
    });

    const byId = new Map(status.connections.map((c) => [c.id, c]));
    expect(status.storage).toBe('temporary');
    expect(byId.get('database.neon')?.status).toBe('not_configured');
    expect(byId.get('database.neon')?.credentialSource).toBe('none');
    expect(byId.get('core.api')?.status).toBe('not_configured');
    expect(byId.get('ai.gemini')?.status).toBe('not_configured');
    expect(byId.get('ai.huggingface')?.status).toBe('not_configured');
    expect(byId.get('ai.ollama')?.status).toBe('not_configured');
    // El fallback determinista sigue disponible
    expect(byId.get('ai.mock')?.status).toBe('active');
  });

  it('base configurada pero no alcanzable -> incomplete', async () => {
    const status = await collectConnectionStatus({
      env: envWith({ DATABASE_URL: FAKE_DB_URL }),
      store: new InMemoryProviderSettingsStore(),
      probeDatabase: async () => false,
    });
    const neon = status.connections.find((c) => c.id === 'database.neon');
    expect(neon?.status).toBe('incomplete');
  });

  it('3. activar y desactivar un proveedor cambia su estado', async () => {
    const env = envWith({ GOOGLE_AI_API_KEY: FAKE_GEMINI_KEY, DATABASE_URL: FAKE_DB_URL });
    const store = new InMemoryProviderSettingsStore();

    const before = await collectConnectionStatus({ env, store, probeDatabase: async () => true });
    expect(before.connections.find((c) => c.id === 'ai.gemini')?.status).toBe('active');

    await store.setEnabled('gemini', false);
    const disabled = await collectConnectionStatus({ env, store, probeDatabase: async () => true });
    const gemini = disabled.connections.find((c) => c.id === 'ai.gemini');
    expect(gemini?.status).toBe('disabled');
    expect(gemini?.canToggle).toBe(true);

    await store.setEnabled('gemini', true);
    const restored = await collectConnectionStatus({ env, store, probeDatabase: async () => true });
    expect(restored.connections.find((c) => c.id === 'ai.gemini')?.status).toBe('active');
  });

  it('4. desactivar NO elimina la credencial (solo impide su uso)', async () => {
    const env = envWith({ GOOGLE_AI_API_KEY: FAKE_GEMINI_KEY, DATABASE_URL: FAKE_DB_URL });
    const store = new InMemoryProviderSettingsStore();
    await store.setEnabled('gemini', false);

    const status = await collectConnectionStatus({ env, store, probeDatabase: async () => true });
    const gemini = status.connections.find((c) => c.id === 'ai.gemini');

    expect(gemini?.status).toBe('disabled');
    // La credencial del sistema sigue reportada: no se borro
    expect(gemini?.credentialSource).toBe('system');

    // Y el router la deja de usar sin borrar nada
    const router = new ProviderRouter();
    process.env.GOOGLE_AI_API_KEY = FAKE_GEMINI_KEY;
    router.setProviderEnabled('gemini', false);
    expect(router.isProviderEnabled('gemini')).toBe(false);
    expect(router.getProvidersStatus().find((p) => p.id === 'gemini')?.is_active).toBe(false);
    expect(router.hasProvider('gemini')).toBe(true);
    router.setProviderEnabled('gemini', true);
    expect(router.getProvidersStatus().find((p) => p.id === 'gemini')?.is_active).toBe(true);
  });

  it('5. la Casa no recibe claves, tokens ni URLs internas', async () => {
    const env = envWith({
      DATABASE_URL: FAKE_DB_URL,
      DANTE_CORE_TOKEN: 'super-secret-bridge-token',
      GOOGLE_AI_API_KEY: FAKE_GEMINI_KEY,
      HUGGING_FACE_API_KEY: 'hf-secret-value',
      GROQ_API_KEY: 'gsk-secret-value',
    });

    const status = await collectConnectionStatus({
      env,
      store: new InMemoryProviderSettingsStore(),
      probeDatabase: async () => true,
    });

    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain(FAKE_GEMINI_KEY);
    expect(serialized).not.toContain('super-secret-bridge-token');
    expect(serialized).not.toContain('super-secret-password');
    expect(serialized).not.toContain('db.internal');
    expect(serialized).not.toContain('postgres://');
    expect(serialized).not.toContain('hf-secret-value');
    expect(serialized).not.toContain('gsk-secret-value');
  });

  it('7. el bridge sin token responde error claro y no inventa estado', () => {
    const request = { headers: { get: () => null } };

    const missing = requireCoreToken(request, {});
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.status).toBe(500);
      expect(missing.body.error.code).toBe('CONFIGURATION_ERROR');
    }

    const wrong = requireCoreToken({ headers: { get: () => 'Bearer token-incorrecto' } }, { DANTE_CORE_TOKEN: 'token-correcto' });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.status).toBe(401);

    const ok = requireCoreToken({ headers: { get: () => 'Bearer token-correcto' } }, { DANTE_CORE_TOKEN: 'token-correcto' });
    expect(ok.ok).toBe(true);
  });

  it('describe la lista de proveedores del Core sin credenciales', () => {
    const ids = CORE_PROVIDER_CATALOGUE.map((p) => p.id);
    expect(ids).toEqual(['gemini', 'huggingface', 'ollama', 'groq', 'mock']);
    for (const entry of CORE_PROVIDER_CATALOGUE) {
      expect(entry.id).not.toMatch(/key|secret|token/i);
    }
  });
});

describe('Sondeo de base y store de ajustes', () => {
  it('probeDatabase trata fallo y timeout como no alcanzable', async () => {
    expect(await probeDatabase(async () => { throw new Error('boom'); })).toBe(false);
    expect(await probeDatabase(() => new Promise((resolve) => setTimeout(resolve, 50)), 5)).toBe(false);
    expect(await probeDatabase(async () => 'ok')).toBe(true);
  });

  it('la seleccion del store es durable solo con DATABASE_URL y ejecutor SQL', () => {
    expect(isDatabaseConfigured({ DATABASE_URL: FAKE_DB_URL })).toBe(true);
    expect(isDatabaseConfigured({})).toBe(false);
    expect(getConnectionStorageMode({ DATABASE_URL: FAKE_DB_URL })).toBe('durable');
    expect(getConnectionStorageMode({})).toBe('temporary');

    const withDb = getProviderSettingsStore({
      env: { DATABASE_URL: FAKE_DB_URL },
      runSql: async () => ({ rows: [] }),
    });
    expect(withDb).toBeInstanceOf(PostgresProviderSettingsStore);

    // Con base configurada pero sin ejecutor SQL: temporal, sin inventar persistencia
    const withoutRunner = getProviderSettingsStore({ env: { DATABASE_URL: FAKE_DB_URL } });
    expect(withoutRunner).toBeInstanceOf(InMemoryProviderSettingsStore);

    const noDb = getProviderSettingsStore({ env: {} });
    expect(noDb).toBeInstanceOf(InMemoryProviderSettingsStore);
  });

  it('el store Postgres filtra por enabled=false y sanitiza errores', async () => {
    const executed: string[] = [];
    const store = new PostgresProviderSettingsStore(async (text, params) => {
      executed.push(text);
      if (text.startsWith('SELECT')) return { rows: [{ provider_id: 'gemini' }] };
      expect(params).toEqual(['gemini', false]);
      return { rows: [] };
    });

    expect(await store.listDisabled()).toEqual(['gemini']);
    await store.setEnabled('gemini', false);
    expect(executed[0]).toContain('FROM provider_settings');
    expect(executed[1]).toContain('INSERT INTO provider_settings');

    const failing = new PostgresProviderSettingsStore(async () => {
      throw new Error('connection to db.internal refused');
    });
    await expect(failing.listDisabled()).rejects.toThrow('Provider settings store unavailable');
  });

  it('buildConnectionStatus es puro y respeta el esquema', () => {
    const built = buildConnectionStatus({
      generatedAt: '2026-10-16T00:00:00.000Z',
      storage: 'temporary',
      databaseConfigured: false,
      databaseReachable: false,
      coreApiConfigured: false,
      providers: [
        { id: 'gemini', name: 'Google Gemini', configured: false, enabled: true, routable: true, credentialSource: 'none' },
        { id: 'groq', name: 'Groq', configured: true, enabled: true, routable: false, credentialSource: 'system' },
      ],
    });

    expect(ConnectionsStatusResponseSchema.safeParse(built).success).toBe(true);
    expect(built.connections.find((c) => c.id === 'ai.groq')?.status).toBe('incomplete');
  });
});
