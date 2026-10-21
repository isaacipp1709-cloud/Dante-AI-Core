import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/chat/route';
import { OWNER_ASSERTION_HEADER } from '../../src/lib/owner-assertion';
import { signAssertionForTest } from '../helpers/owner-assertion';

const VALID_TOKEN = 'test-core-token-for-sanitization';

describe('POST /api/chat — Error Sanitization & Leak Prevention', () => {
  const originalEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DANTE_CORE_TOKEN = VALID_TOKEN;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  it('1. Returns sanitized generic message on HTTP 500 when JSON parsing throws internal secret error', async () => {
    const assertion = signAssertionForTest('user-safe', VALID_TOKEN);
    const request = new NextRequest('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${VALID_TOKEN}`,
        [OWNER_ASSERTION_HEADER]: assertion,
      },
      body: 'invalid-json-content',
    });

    // Mock request.json to reject with an internal database exception containing secrets
    jest.spyOn(request, 'json').mockRejectedValueOnce(
      new Error('Connection failure: postgres://admin:SuperSecretDatabasePass@ep-quiet-forest-b571toev.us-east-2.aws.neon.tech/neondb')
    );

    const response = await POST(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred while processing the chat request',
    });

    const responseString = JSON.stringify(body);
    expect(responseString).not.toContain('SuperSecretDatabasePass');
    expect(responseString).not.toContain('admin');
    expect(responseString).not.toContain('ep-quiet-forest');
    expect(responseString).not.toContain('Connection failure');

    // Verify console error logging also does not contain the plaintext password
    const loggedCalls = consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join(' ');
    expect(loggedCalls).not.toContain('SuperSecretDatabasePass');
  });

  it('2. Uncaught exceptions during request processing never leak credentials or stack details in body', async () => {
    const assertion = signAssertionForTest('user-safe', VALID_TOKEN);
    const request = new NextRequest('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${VALID_TOKEN}`,
        [OWNER_ASSERTION_HEADER]: assertion,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        credentialId: 'cred-123',
      }),
    });

    // Force an internal error with sensitive token parameters
    jest.spyOn(request, 'json').mockRejectedValueOnce(
      new Error('Internal unexpected fault: password="ultra_secret_db_token" at Query.run')
    );

    const response = await POST(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.message).toBe('An internal error occurred while processing the chat request');
    expect(JSON.stringify(body)).not.toContain('ultra_secret_db_token');
  });
});
