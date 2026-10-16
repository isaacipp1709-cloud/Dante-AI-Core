import type { EncryptedCredential } from './credential-crypto';

/**
 * Persistencia de credenciales BYOK en Dante-AI-Core.
 * - NeonCredentialStore usa el cliente PostgreSQL del Core (DATABASE_URL).
 * - InMemoryCredentialStore es el fallback de desarrollo, marcado como temporal.
 * - Toda operacion filtra SIEMPRE por owner_id.
 */

export interface StoredCredential {
  credentialId: string;
  ownerId: string;
  providerId: string;
  encrypted: EncryptedCredential;
  createdAt: string;
}

export interface CredentialStore {
  create(input: {
    ownerId: string;
    providerId: string;
    credentialId: string;
    encrypted: EncryptedCredential;
    createdAt: string;
  }): Promise<void>;

  listByOwner(ownerId: string): Promise<StoredCredential[]>;

  findByOwnerAndId(ownerId: string, credentialId: string): Promise<StoredCredential | null>;

  deleteByOwnerAndId(ownerId: string, credentialId: string): Promise<boolean>;
}

export class CredentialStoreError extends Error {
  constructor(message = 'Credential store unavailable') {
    super(message);
    this.name = 'CredentialStoreError';
  }
}

function clone(record: StoredCredential): StoredCredential {
  return { ...record, encrypted: { ...record.encrypted } };
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly records = new Map<string, StoredCredential>();

  async create(input: {
    ownerId: string;
    providerId: string;
    credentialId: string;
    encrypted: EncryptedCredential;
    createdAt: string;
  }): Promise<void> {
    this.records.set(input.credentialId, {
      credentialId: input.credentialId,
      ownerId: input.ownerId,
      providerId: input.providerId,
      encrypted: { ...input.encrypted },
      createdAt: input.createdAt,
    });
  }

  async listByOwner(ownerId: string): Promise<StoredCredential[]> {
    return Array.from(this.records.values())
      .filter((record) => record.ownerId === ownerId)
      .map(clone);
  }

  async findByOwnerAndId(ownerId: string, credentialId: string): Promise<StoredCredential | null> {
    const record = this.records.get(credentialId);
    if (!record || record.ownerId !== ownerId) return null;
    return clone(record);
  }

  async deleteByOwnerAndId(ownerId: string, credentialId: string): Promise<boolean> {
    const record = this.records.get(credentialId);
    if (!record || record.ownerId !== ownerId) return false;
    this.records.delete(credentialId);
    return true;
  }
}

export interface SqlResult {
  rows: unknown[];
  rowCount?: number | null;
}

export type SqlRunner = (text: string, params?: unknown[]) => Promise<SqlResult>;

export const CREDENTIALS_TABLE = 'user_provider_credentials';

function mapRow(row: unknown): StoredCredential | null {
  if (typeof row !== 'object' || row === null) return null;
  const value = row as Record<string, unknown>;
  if (
    typeof value.credential_id !== 'string' ||
    typeof value.owner_id !== 'string' ||
    typeof value.provider_id !== 'string' ||
    typeof value.algorithm !== 'string' ||
    typeof value.iv !== 'string' ||
    typeof value.auth_tag !== 'string' ||
    typeof value.ciphertext !== 'string'
  ) {
    return null;
  }
  return {
    credentialId: value.credential_id,
    ownerId: value.owner_id,
    providerId: value.provider_id,
    encrypted: {
      algorithm: value.algorithm,
      iv: value.iv,
      authTag: value.auth_tag,
      ciphertext: value.ciphertext,
    },
    createdAt: typeof value.created_at === 'string' ? value.created_at : '',
  };
}

const SELECTED =
  'credential_id, owner_id, provider_id, algorithm, iv, auth_tag, ciphertext, created_at';

export class NeonCredentialStore implements CredentialStore {
  constructor(private readonly run: SqlRunner) {}

  async create(input: {
    ownerId: string;
    providerId: string;
    credentialId: string;
    encrypted: EncryptedCredential;
    createdAt: string;
  }): Promise<void> {
    try {
      await this.run(
        `INSERT INTO ${CREDENTIALS_TABLE}
           (owner_id, provider_id, credential_id, algorithm, iv, auth_tag, ciphertext, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.ownerId,
          input.providerId,
          input.credentialId,
          input.encrypted.algorithm,
          input.encrypted.iv,
          input.encrypted.authTag,
          input.encrypted.ciphertext,
          input.createdAt,
        ],
      );
    } catch {
      throw new CredentialStoreError();
    }
  }

  async listByOwner(ownerId: string): Promise<StoredCredential[]> {
    try {
      const result = await this.run(
        `SELECT ${SELECTED} FROM ${CREDENTIALS_TABLE} WHERE owner_id = $1 ORDER BY created_at DESC`,
        [ownerId],
      );
      const records: StoredCredential[] = [];
      for (const row of result.rows) {
        const mapped = mapRow(row);
        if (mapped) records.push(mapped);
      }
      return records;
    } catch {
      throw new CredentialStoreError();
    }
  }

  async findByOwnerAndId(ownerId: string, credentialId: string): Promise<StoredCredential | null> {
    try {
      const result = await this.run(
        `SELECT ${SELECTED} FROM ${CREDENTIALS_TABLE} WHERE owner_id = $1 AND credential_id = $2 LIMIT 1`,
        [ownerId, credentialId],
      );
      if (result.rows.length === 0) return null;
      return mapRow(result.rows[0]);
    } catch {
      throw new CredentialStoreError();
    }
  }

  async deleteByOwnerAndId(ownerId: string, credentialId: string): Promise<boolean> {
    try {
      const result = await this.run(
        `DELETE FROM ${CREDENTIALS_TABLE} WHERE owner_id = $1 AND credential_id = $2 RETURNING credential_id`,
        [ownerId, credentialId],
      );
      if (typeof result.rowCount === 'number') return result.rowCount > 0;
      return result.rows.length > 0;
    } catch {
      throw new CredentialStoreError();
    }
  }
}
