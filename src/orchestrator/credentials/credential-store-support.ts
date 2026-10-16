export {
  CredentialStoreError,
  InMemoryCredentialStore,
  NeonCredentialStore,
  CREDENTIALS_TABLE,
} from './credential-store';
export type { CredentialStore, SqlRunner, SqlResult, StoredCredential } from './credential-store';

/** true cuando Dante-AI-Core tiene configurada su base PostgreSQL (Neon). */
export function isNeonConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.length > 0;
}
