import { query } from './database';
import { requireCoreToken } from './core-auth';
import { OWNER_ASSERTION_HEADER, verifyOwnerAssertion } from './owner-assertion';
import {
  CredentialConfigurationError,
  CredentialNotFoundError,
  ProviderNotSupportedError,
  getCredentialService,
  type CredentialService,
} from '../orchestrator/credentials/credential-service';
import {
  CredentialIntegrityError,
} from '../orchestrator/credentials/credential-crypto';
import {
  CredentialStoreError,
  type SqlRunner,
} from '../orchestrator/credentials/credential-store-support';

/**
 * Contexto de una operacion BYOK: token del bridge + identidad firmada del usuario.
 * El ownerId proviene EXCLUSIVAMENTE de la asercion verificada.
 */

export interface ByokContext {
  ownerId: string;
  service: CredentialService;
}

export type ByokContextResult =
  | { ok: true; context: ByokContext }
  | { ok: false; status: number; body: { error: { code: string; message: string } } };

export interface ResolveByokDeps {
  env?: Record<string, string | undefined>;
  runSql?: SqlRunner;
}

export function resolveByokContext(request: Request, deps: ResolveByokDeps = {}): ByokContextResult {
  const env = deps.env ?? process.env;

  const auth = requireCoreToken(request, env);
  if (!auth.ok) return { ok: false, status: auth.status, body: auth.body };

  const assertion = verifyOwnerAssertion({
    assertion: request.headers.get(OWNER_ASSERTION_HEADER),
    secret: env.DANTE_CORE_TOKEN,
  });
  if (!assertion.ok) {
    return {
      ok: false,
      status: assertion.status,
      body: { error: { code: assertion.code, message: assertion.message } },
    };
  }

  const runSql: SqlRunner =
    deps.runSql ?? ((text, params) => query(text, params as unknown[] | undefined));

  return {
    ok: true,
    context: {
      ownerId: assertion.ownerId,
      service: getCredentialService({ env, runSql }),
    },
  };
}

/**
 * Autorizacion administrativa para ajustes globales (activar/desactivar proveedores).
 * Deny-by-default: sin lista configurada nadie puede cambiar ajustes del sistema.
 * Los ids provienen de la asercion firmada, nunca del navegador.
 */
export function isAdminOwner(
  ownerId: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.DANTE_ADMIN_OWNER_IDS;
  if (typeof raw !== 'string' || raw.trim().length === 0) return false;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .includes(ownerId);
}

/** Traduce fallos del servicio a codigos estables sin filtrar detalles internos. */
export function mapCredentialError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof CredentialNotFoundError) {
    return { status: 404, code: 'NOT_FOUND', message: 'Credential not found.' };
  }
  if (error instanceof CredentialIntegrityError) {
    return { status: 404, code: 'NOT_FOUND', message: 'Credential not found.' };
  }
  if (error instanceof ProviderNotSupportedError) {
    return { status: 400, code: 'PROVIDER_NOT_SUPPORTED', message: 'Proveedor no habilitado para BYOK.' };
  }
  if (error instanceof CredentialConfigurationError) {
    return { status: 500, code: 'CONFIGURATION_ERROR', message: 'Falta configuracion de cifrado en el servidor.' };
  }
  if (error instanceof CredentialStoreError) {
    return { status: 503, code: 'STORAGE_ERROR', message: 'No fue posible acceder al almacenamiento de credenciales.' };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'No fue posible completar la operacion.' };
}
