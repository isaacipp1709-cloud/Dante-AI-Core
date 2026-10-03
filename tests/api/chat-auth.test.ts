/**
 * Tests de autenticación Bearer token para POST /api/chat
 * Usa NextRequest directamente — no levanta servidor HTTP.
 */
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/chat/route';

const VALID_TOKEN = 'test-token-for-jest-only';

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'hola' }]
    })
  });
}

describe('POST /api/chat — Autenticación Bearer', () => {
  beforeEach(() => {
    process.env.DANTE_CORE_TOKEN = VALID_TOKEN;
  });

  afterEach(() => {
    delete process.env.DANTE_CORE_TOKEN;
  });

  // Test 1: Sin header Authorization → 401
  it('rechaza request sin Authorization → 401 UNAUTHORIZED', async () => {
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).not.toContain(VALID_TOKEN);
  });

  // Test 2: Token inválido → 401
  it('rechaza token inválido → 401 UNAUTHORIZED', async () => {
    const req = makeRequest('Bearer token-incorrecto-xyz');
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).not.toContain(VALID_TOKEN);
  });

  // Test 3: Token válido → 200 y procesamiento
  it('acepta token válido → 200 y respuesta del orquestador', async () => {
    const req = makeRequest(`Bearer ${VALID_TOKEN}`);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.choices).toBeDefined();
    expect(body.choices[0].message.role).toBe('assistant');
  });
});
