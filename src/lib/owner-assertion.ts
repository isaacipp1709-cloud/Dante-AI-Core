import crypto from 'node:crypto';

/**
 * Identidad del usuario final firmada por La Casa y verificada por el Core.
 *
 * El token del bridge autentica a La Casa; la identidad del usuario viaja en una
 * asercion HMAC-SHA256 firmada con ese mismo secreto de servidor (no se agregan
 * secretos nuevos). El Core NUNCA acepta un userId arbitrario del cuerpo.
 */

export const OWNER_ASSERTION_HEADER = 'x-dante-owner-assertion';

export interface OwnerAssertionPayload {
  ownerId: string;
  iat: number;
  exp: number;
}

export type OwnerAssertionResult =
  | { ok: true; ownerId: string }
  | { ok: false; status: number; code: string; message: string };

function base64UrlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function signatureFor(payloadSegment: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(payloadSegment).digest();
}

export interface VerifyOwnerAssertionOptions {
  assertion: string | null | undefined;
  secret: string | undefined;
  now?: number;
}

export function verifyOwnerAssertion(options: VerifyOwnerAssertionOptions): OwnerAssertionResult {
  const secret = options.secret;
  if (typeof secret !== 'string' || secret.length === 0) {
    return {
      ok: false,
      status: 500,
      code: 'CONFIGURATION_ERROR',
      message: 'La verificacion de identidad no esta configurada.',
    };
  }

  const assertion = options.assertion;
  if (typeof assertion !== 'string' || assertion.length === 0) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario requerida.' };
  }

  const parts = assertion.split('.');
  if (parts.length !== 2) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario invalida.' };
  }

  const [payloadSegment, signatureSegment] = parts;
  const expected = signatureFor(payloadSegment, secret);

  let provided: Buffer;
  try {
    provided = base64UrlToBuffer(signatureSegment);
  } catch {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario invalida.' };
  }

  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario invalida.' };
  }

  let payload: OwnerAssertionPayload;
  try {
    const decoded = JSON.parse(base64UrlToBuffer(payloadSegment).toString('utf8')) as unknown;
    if (typeof decoded !== 'object' || decoded === null) throw new Error('bad payload');
    const value = decoded as Record<string, unknown>;
    if (typeof value.ownerId !== 'string' || value.ownerId.length === 0) throw new Error('bad owner');
    if (typeof value.exp !== 'number') throw new Error('bad exp');
    payload = {
      ownerId: value.ownerId,
      iat: typeof value.iat === 'number' ? value.iat : 0,
      exp: value.exp,
    };
  } catch {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario invalida.' };
  }

  const now = options.now ?? Date.now();
  if (payload.exp <= now) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Identidad del usuario expirada.' };
  }

  return { ok: true, ownerId: payload.ownerId };
}
