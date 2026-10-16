import type {
  Connection,
  ConnectionsStatusResponse,
} from '../../contracts/connections';
import {
  getConnectionStorageMode,
  isDatabaseConfigured,
  type ProviderSettingsStore,
} from './provider-settings-store';

/**
 * Modelo central de conexiones: arma el estado REAL y sanitizado de cada conexion.
 * Nunca incluye claves, tokens, URLs internas ni valores de entorno.
 */

export interface ProviderCatalogueEntry {
  id: string;
  name: string;
  envKeys: string[];
  /** false mientras no exista adaptador capaz de ejecutarlo. */
  routable: boolean;
  /** true cuando el proveedor funciona sin credencial (fallback determinista). */
  alwaysConfigured?: boolean;
}

export const CORE_PROVIDER_CATALOGUE: readonly ProviderCatalogueEntry[] = [
  { id: 'gemini', name: 'Google Gemini', envKeys: ['GOOGLE_AI_API_KEY', 'GEMINI_API_KEY'], routable: true },
  { id: 'huggingface', name: 'Hugging Face', envKeys: ['HUGGING_FACE_API_KEY'], routable: true },
  { id: 'ollama', name: 'Ollama (local)', envKeys: ['OLLAMA_BASE_URL'], routable: true },
  { id: 'groq', name: 'Groq', envKeys: ['GROQ_API_KEY'], routable: false },
  { id: 'mock', name: 'Mock (fallback)', envKeys: [], routable: true, alwaysConfigured: true },
];

export function isProviderConfigured(
  entry: ProviderCatalogueEntry,
  env: Record<string, string | undefined>,
): boolean {
  if (entry.alwaysConfigured) return true;
  return entry.envKeys.some((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/** Sondea la base con timeout; cualquier fallo cuenta como no alcanzable. */
export async function probeDatabase(probe: () => Promise<unknown>, timeoutMs = 2000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const attempt = probe().then(() => true).catch(() => false);
    return await Promise.race([attempt, timeout]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface BuildConnectionStatusInput {
  generatedAt: string;
  storage: 'durable' | 'temporary';
  databaseConfigured: boolean;
  databaseReachable: boolean;
  coreApiConfigured: boolean;
  providers: Array<{
    id: string;
    name: string;
    configured: boolean;
    enabled: boolean;
    routable: boolean;
    credentialSource: 'system' | 'none';
  }>;
}

/** Funcion pura: sin acceso a entorno, red ni base de datos. */
export function buildConnectionStatus(input: BuildConnectionStatusInput): ConnectionsStatusResponse {
  const connections: Connection[] = [];

  connections.push({
    id: 'database.neon',
    name: 'Base de datos (Neon)',
    type: 'database',
    owner: 'system',
    canToggle: false,
    credentialSource: input.databaseConfigured ? 'system' : 'none',
    status: !input.databaseConfigured ? 'not_configured' : input.databaseReachable ? 'active' : 'incomplete',
    detail: !input.databaseConfigured
      ? 'DATABASE_URL no esta configurada en Dante-AI-Core.'
      : input.databaseReachable
        ? 'Dante-AI-Core responde consultas contra la base.'
        : 'DATABASE_URL existe pero la base no respondio.',
  });

  connections.push({
    id: 'core.api',
    name: 'API interna de Dante-AI-Core',
    type: 'integration',
    owner: 'system',
    canToggle: false,
    credentialSource: input.coreApiConfigured ? 'system' : 'none',
    status: input.coreApiConfigured ? 'active' : 'not_configured',
    detail: input.coreApiConfigured
      ? 'El bridge exige token Bearer.'
      : 'Falta el token del bridge en el servidor.',
  });

  for (const provider of input.providers) {
    let providerStatus: Connection['status'];
    let detail: string;
    if (!provider.routable) {
      providerStatus = 'incomplete';
      detail = 'Adaptador no implementado todavia en el Core.';
    } else if (!provider.configured) {
      providerStatus = 'not_configured';
      detail = 'Sin credencial del sistema configurada.';
    } else if (!provider.enabled) {
      providerStatus = 'disabled';
      detail = 'Desactivado desde el panel; la credencial se conserva.';
    } else {
      providerStatus = 'active';
      detail = 'Disponible para ejecucion.';
    }

    connections.push({
      id: `ai.${provider.id}`,
      name: provider.name,
      type: 'ai_provider',
      owner: 'system',
      canToggle: provider.routable,
      credentialSource: provider.credentialSource,
      status: providerStatus,
      detail,
    });
  }

  return { generatedAt: input.generatedAt, storage: input.storage, connections };
}

export interface CollectConnectionStatusDeps {
  env: Record<string, string | undefined>;
  store: ProviderSettingsStore;
  probeDatabase: () => Promise<boolean>;
  now?: () => Date;
}

/** Reune el estado real usando dependencias inyectables (testeable sin red ni base). */
export async function collectConnectionStatus(
  deps: CollectConnectionStatusDeps,
): Promise<ConnectionsStatusResponse> {
  const env = deps.env;
  const generatedAt = (deps.now ? deps.now() : new Date()).toISOString();
  const storage = getConnectionStorageMode(env);
  const databaseConfigured = isDatabaseConfigured(env);

  let disabled: string[] = [];
  try {
    disabled = await deps.store.listDisabled();
  } catch {
    disabled = [];
  }

  const databaseReachable = databaseConfigured ? await deps.probeDatabase() : false;

  const providers = CORE_PROVIDER_CATALOGUE.map((entry) => {
    const configured = isProviderConfigured(entry, env);
    return {
      id: entry.id,
      name: entry.name,
      configured,
      enabled: !disabled.includes(entry.id),
      routable: entry.routable,
      credentialSource: (configured && !entry.alwaysConfigured ? 'system' : 'none') as 'system' | 'none',
    };
  });

  return buildConnectionStatus({
    generatedAt,
    storage,
    databaseConfigured,
    databaseReachable,
    coreApiConfigured:
      typeof env.DANTE_CORE_TOKEN === 'string' && env.DANTE_CORE_TOKEN.length > 0,
    providers,
  });
}
