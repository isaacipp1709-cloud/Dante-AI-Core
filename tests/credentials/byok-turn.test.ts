import { runByokChatTurn } from '../../src/orchestrator/credentials/byok-turn';

const BASE = {
  providerId: 'gemini',
  apiKey: 'clave-de-boveda-solo-executor',
  messages: [{ role: 'user' as const, content: 'hola Dante' }],
  financialContext: { timezone: 'UTC', locale: 'es-CL', userId: 'user-a' },
  disabledProviders: [] as string[],
  routerEnabled: true,
};

describe('Turno BYOK dentro del recorrido de Dante', () => {
  it('1. consulta permitida: pasa por el orquestador y llega UNA vez al ejecutor', async () => {
    let calls = 0;
    let receivedKey = '';
    let receivedPrompt = '';

    const result = await runByokChatTurn({
      ...BASE,
      executor: async (input) => {
        calls += 1;
        receivedKey = input.apiKey;
        receivedPrompt = input.prompt;
        return { content: 'respuesta sintetica', model: 'gemini-1.5-flash' };
      },
    });

    expect(result.status).toBe('ok');
    expect(calls).toBe(1);
    expect(receivedKey).toBe(BASE.apiKey);
    if (result.status === 'ok') {
      expect(result.orchestration.action).toBe('CONTEXT_LOADED_WAITING_LLM');
      expect(result.content).toBe('respuesta sintetica');
    }
    // El secreto solo va al ejecutor: nunca al prompt ni a la respuesta.
    expect(receivedPrompt).not.toContain(BASE.apiKey);
    expect(JSON.stringify(result)).not.toContain(BASE.apiKey);
  });

  it('conserva el contexto financiero del orquestador en el prompt', async () => {
    let prompt = '';
    const result = await runByokChatTurn({
      ...BASE,
      financialContext: { cajaDisponibleCLP: 1_000_000, sueldosLiquidosMensualesCLP: 500_000 },
      executor: async (input) => { prompt = input.prompt; return { content: 'ok', model: 'm' }; },
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.enrichedWithFinancialContext).toBe(true);
    expect(prompt).toContain('[System Context: Financial calculations:');
  });

  it('2. guardrail rechaza: el ejecutor NO se invoca', async () => {
    let calls = 0;
    const result = await runByokChatTurn({
      ...BASE,
      messages: [{ role: 'user', content: 'vacas vuelan' }],
      executor: async () => { calls += 1; return { content: 'no deberia', model: 'm' }; },
    });

    expect(calls).toBe(0);
    expect(result.status).toBe('guardrail');
    expect(result.executionInvocations).toBe(0);
  });

  it('3. proveedor desactivado: el ejecutor NO se invoca', async () => {
    let calls = 0;
    const result = await runByokChatTurn({
      ...BASE,
      disabledProviders: ['gemini'],
      executor: async () => { calls += 1; return { content: 'no deberia', model: 'm' }; },
    });

    expect(calls).toBe(0);
    expect(result.status).toBe('blocked');
    expect(result.code).toBe('PROVIDER_DISABLED');
  });

  it('tambien bloquea si el runtime lo desactivo', async () => {
    const result = await runByokChatTurn({ ...BASE, routerEnabled: false });
    expect(result.status).toBe('blocked');
  });

  it('error del proveedor no filtra la clave ni la respuesta cruda', async () => {
    const failure = Object.assign(new Error('upstream 401 con clave ' + BASE.apiKey), { code: 'AUTH_ERROR' });
    const result = await runByokChatTurn({
      ...BASE,
      executor: async () => { throw failure; },
    });

    expect(result.status).toBe('provider_error');
    expect(result.code).toBe('AUTH_ERROR');
    expect(JSON.stringify(result)).not.toContain(BASE.apiKey);
  });
});
