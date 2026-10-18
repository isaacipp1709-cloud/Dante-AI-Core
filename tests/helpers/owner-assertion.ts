import crypto from 'node:crypto';

/** Firma una asercion con el formato acordado (payload base64url . hmac base64url). */
export function signAssertionForTest(ownerId: string, secret: string, ttlMs = 60_000): string {
  const payload = { ownerId, iat: Date.now(), exp: Date.now() + ttlMs };
  const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(segment).digest().toString('base64url');
  return segment + '.' + signature;
}
