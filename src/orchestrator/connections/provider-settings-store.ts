/**
 * Persistencia de los ajustes de conexion de proveedores (activar/desactivar).
 *
 * - Con DATABASE_URL (Neon) el estado es durable.
 * - Sin DATABASE_URL el estado vive en memoria y es TEMPORAL: se pierde al reiniciar.
 * - Desactivar un proveedor NO toca su credencial: solo cambia la bandera.
 * - Los errores del proveedor de datos se convierten en ProviderSettingsError sin
 *   exponer mensajes internos.
 */

export interface ProviderSettingsStore {
  listDisabled(): Promise<string[]>;
  setEnabled(providerId: string, enabled: boolean): Promise<void>;
}

export class ProviderSettingsError extends Error {
  constructor(message = 'Provider settings store unavailable') {
    super(message);
    this.name = 'ProviderSettingsError';
  }
}

export class InMemoryProviderSettingsStore implements ProviderSettingsStore {
  private readonly disabled = new Set<string>();

  async listDisabled(): Promise<string[]> {
    return Array.from(this.disabled);
  }

  async setEnabled(providerId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      this.disabled.delete(providerId);
    } else {
      this.disabled.add(providerId);
    }
  }
}

export type SqlRunner = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

export class PostgresProviderSettingsStore implements ProviderSettingsStore {
  constructor(private readonly run: SqlRunner) {}

  async listDisabled(): Promise<string[]> {
    try {
      const result = await this.run('SELECT provider_id FROM provider_settings WHERE enabled = false');
      const ids: string[] = [];
      for (const row of result.rows) {
        if (typeof row === 'object' && row !== null) {
          const value = (row as { provider_id?: unknown }).provider_id;
          if (typeof value === 'string') ids.push(value);
        }
      }
      return ids;
    } catch {
      throw new ProviderSettingsError();
    }
  }

  async setEnabled(providerId: string, enabled: boolean): Promise<void> {
    try {
      await this.run(
        `INSERT INTO provider_settings (provider_id, enabled, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (provider_id)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
        [providerId, enabled],
      );
    } catch {
      throw new ProviderSettingsError();
    }
  }
}

export type ConnectionStorageMode = 'durable' | 'temporary';

export function isDatabaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.length > 0;
}

export function getConnectionStorageMode(
  env: Record<string, string | undefined> = process.env,
): ConnectionStorageMode {
  return isDatabaseConfigured(env) ? 'durable' : 'temporary';
}

const globalState = globalThis as unknown as {
  __danteProviderSettingsMemoryStore?: InMemoryProviderSettingsStore;
};

/** Store en memoria compartido por proceso (estado temporal cuando no hay base). */
export function getMemoryProviderSettingsStore(): InMemoryProviderSettingsStore {
  if (!globalState.__danteProviderSettingsMemoryStore) {
    globalState.__danteProviderSettingsMemoryStore = new InMemoryProviderSettingsStore();
  }
  return globalState.__danteProviderSettingsMemoryStore;
}

export interface GetProviderSettingsOptions {
  env?: Record<string, string | undefined>;
  runSql?: SqlRunner;
}

/**
 * Store de ajustes: durable cuando hay DATABASE_URL y un ejecutor SQL disponible;
 * en caso contrario, memoria claramente identificada como temporal.
 */
export function getProviderSettingsStore(options: GetProviderSettingsOptions = {}): ProviderSettingsStore {
  const env = options.env ?? process.env;
  if (!isDatabaseConfigured(env)) return getMemoryProviderSettingsStore();

  const runner = options.runSql;
  if (!runner) {
    // Sin ejecutor SQL no se inventa persistencia: se degrada a temporal.
    return getMemoryProviderSettingsStore();
  }
  return new PostgresProviderSettingsStore(runner);
}
