/**
 * Contrato de POST /api/chat tras el endurecimiento:
 * 1) token del bridge, 2) asercion firmada del usuario, 3) credentialId de la boveda.
 * Usa NextRequest directamente — no levanta servidor HTTP ni llama servicios reales.
 */
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/chat/route';
import { signAssertionForTest } from '../helpers/owner-assertion';
import { OWNER_ASSERTION_HEADER } from '../../src/lib/owner-assertion';

const VALID_TOKEN = 'test-token-for-jest-only';

function makeRequest(opts: { auth?: string; assertion?: string; credentialId?: string } = {}): NextRequest {
  return new NextRequest('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.auth ? { authorization: opts.auth } : {}),
      ...(opts.assertion ? { [OWNER_ASSERTION_HEADER]: opts.assertion } : {}),
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hola' }],
      ...(opts.credentialId ? { credentialId: opts.credentialId } : {}),
    }),
  });
}

describe('POST /api/chat — token, identidad y boveda', () => {
  beforeEach(() => {
    process.env.DANTE_CORE_TOKEN = VALID_TOKEN;
  });

  afterEach(() => {
    delete process.env.DANTE_CORE_TOKEN;
  });

  it('rechaza request sin Authorization → 401 UNAUTHORIZED', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).not.toContain(VALID_TOKEN);
  });

  it('rechaza token inválido → 401 UNAUTHORIZED', async () => {
    const res = await POST(makeRequest({ auth: 'Bearer token-incorrecto-xyz' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('UNAUTHORIZED');
  });

  it('con token válido pero SIN asercion de identidad → 401', async () => {
    const res = await POST(makeRequest({ auth: `Bearer ${VALID_TOKEN}` }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(JSON.stringify(body)).not.toContain(VALID_TOKEN);
  });

  it('con asercion válida pero SIN credentialId → 400 CREDENTIAL_REQUIRED (sin claves de entorno)', async () => {
    const assertion = signAssertionForTest('user-a', VALID_TOKEN);
    const res = await POST(makeRequest({ auth: `Bearer ${VALID_TOKEN}`, assertion }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('CREDENTIAL_REQUIRED');
  });

  it('rechaza asercion vencida → 401', async () => {
    const assertion = signAssertionForTest('user-a', VALID_TOKEN, -1000);
    const res = await POST(makeRequest({ auth: `Bearer ${VALID_TOKEN}`, assertion }));
    expect(res.status).toBe(401);
  });
});
