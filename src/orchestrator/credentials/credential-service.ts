import crypto from 'node:crypto';
import { query } from '../../lib/database';
import {
  CredentialConfigurationError,
  CredentialCrypto,
  CredentialIntegrityError,
  type EncryptedCredential,
} from './credential-crypto';
import {
  CredentialStoreError,
  InMemoryCredentialStore,
  NeonCredentialStore,
  isNeonConfigured,
  type CredentialStore,
  type SqlRunner,
} from './credential-store-support';

/**
 * Servicio unico de credenciales BYOK del Core.
 * - Cifra con AES-256-GCM y persiste en Neon cuando DATABASE_URL esta disponible.
 * - Sin base: store en memoria marcado como temporal.
 * - Nunca devuelve la clave salvo en resolveForOwner (uso interno del chat).
 */

/** Proveedores con adaptador BYOK real en el Core. */
export const BYOK_PROVIDERS: readonly string[] = ['gemini'];

export function isByokProvider(value: unknown): boolean {
  return typeof value === 'string' && BYOK_PROVIDERS.includes(value);
}

export class ProviderNotSupportedError extends Error {
  constructor() {
    super('Provider not supported for BYOK');
    this.name = 'ProviderNotSupportedError';
  }
}

export class CredentialNotFoundError extends Error {
  constructor() {
    super('Credential not found');
    this.name = 'CredentialNotFoundError';
  }
}

export interface CredentialMetadata {
  credentialId: string;
  providerId: string;
  createdAt: string;
  status: 'active';
}

export type CredentialStorageMode = 'durable' | 'temporary';

export interface CredentialServiceOptions {
  masterSecret?: string;
  store: CredentialStore;
  storage: CredentialStorageMode;
}

export class CredentialService {
  private readonly crypto: CredentialCrypto;
  private readonly store: CredentialStore;
  readonly storage: CredentialStorageMode;

  constructor(options: CredentialServiceOptions) {
    this.crypto = new CredentialCrypto(options.masterSecret);
    this.store = options.store;
    this.storage = options.storage;
  }

  /** Cifra y persiste la credencial del propietario autenticado. */
  async save(input: { ownerId: string; providerId: string; apiKey: string }): Promise<CredentialMetadata> {
    if (typeof input.ownerId !== 'string' || input.ownerId.length === 0) {
      throw new CredentialConfigurationError('ownerId is required');
    }
    if (!isByokProvider(input.providerId)) throw new ProviderNotSupportedError();
    if (typeof input.apiKey !== 'string' || input.apiKey.trim().length === 0) {
      throw new CredentialConfigurationError('apiKey is required');
    }

    const record = {
      credentialId: crypto.randomUUID(),
      ownerId: input.ownerId,
      providerId: input.providerId,
      createdAt: new Date().toISOString(),
      encrypted: this.crypto.encrypt(input.apiKey),
    };

    await this.store.create(record);
    return toMetadata(record);
  }

  async listMetadata(ownerId: string): Promise<CredentialMetadata[]> {
    const records = await this.store.listByOwner(ownerId);
    return records.map(toMetadata);
  }

  /** Resuelve la clave SOLO para el propietario; ajena e inexistente son indistinguibles. */
  async resolveForOwner(
    credentialId: string,
    ownerId: string,
  ): Promise<{ providerId: string; apiKey: string }> {
    const record = await this.store.findByOwnerAndId(ownerId, credentialId);
    if (!record) throw new CredentialNotFoundError();
    return { providerId: record.providerId, apiKey: this.crypto.decrypt(record.encrypted) };
  }

  async deleteForOwner(credentialId: string, ownerId: string): Promise<void> {
    const deleted = await this.store.deleteByOwnerAndId(ownerId, credentialId);
    if (!deleted) throw new CredentialNotFoundError();
  }
}

function toMetadata(record: {
  credentialId: string;
  providerId: string;
  createdAt: string;
}): CredentialMetadata {
  return {
    credentialId: record.credentialId,
    providerId: record.providerId,
    createdAt: record.createdAt,
    status: 'active',
  };
}

/** Runner SQL real del Core (pg sobre DATABASE_URL). */
async function defaultSqlRunner(text: string, params?: unknown[]) {
  const result = await query(text, params as unknown[] | undefined);
  return { rows: result.rows as unknown[], rowCount: result.rowCount };
}

const globalState = globalThis as unknown as {
  __danteCoreCredentialMemoryStore?: InMemoryCredentialStore;
};

function memoryStore(): InMemoryCredentialStore {
  if (!globalState.__danteCoreCredentialMemoryStore) {
    globalState.__danteCoreCredentialMemoryStore = new InMemoryCredentialStore();
  }
  return globalState.__danteCoreCredentialMemoryStore;
}

export interface GetCredentialServiceOptions {
  env?: Record<string, string | undefined>;
  runSql?: SqlRunner;
}

/**
 * Selecciona el store: Neon cuando hay DATABASE_URL y ejecutor SQL; en caso
 * contrario memoria, claramente identificada como temporal.
 */
export function getCredentialService(options: GetCredentialServiceOptions = {}): CredentialService {
  const env = options.env ?? process.env;
  const masterSecret = env.CREDENTIAL_MASTER_SECRET;

  // Con base configurada NUNCA se degrada a memoria: si la base falla, el store
  // lanza CredentialStoreError y la ruta responde indisponibilidad (503).
  if (isNeonConfigured(env)) {
    const runSql = options.runSql ?? ((text, params) => defaultSqlRunner(text, params));
    return new CredentialService({
      masterSecret,
      store: new NeonCredentialStore(runSql),
      storage: 'durable',
    });
  }

  return new CredentialService({ masterSecret, store: memoryStore(), storage: 'temporary' });
}

export { CredentialConfigurationError, CredentialIntegrityError, CredentialStoreError };
export type { EncryptedCredential, CredentialStore };
