import { runByokChatTurn } from '../../src/orchestrator/credentials/byok-turn';
import {
  ALLOWED_GEMINI_MODELS,
  DEFAULT_BYOK_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL,
  InvalidGeminiModelError,
  defaultByokExecutor,
  isAllowedGeminiModel,
  resolveGeminiModel,
} from '../../src/orchestrator/credentials/byok-executor';
import {
  DEFAULT_GEMINI_MODEL as PROVIDER_DEFAULT_GEMINI_MODEL,
  GeminiProvider,
} from '../../src/orchestrator/providers/gemini';

const BASE = {
  providerId: 'gemini',
  apiKey: 'clave-de-boveda-solo-executor',
  messages: [{ role: 'user' as const, content: 'hola Dante' }],
  financialContext: { timezone: 'UTC', locale: 'es-CL', userId: 'user-a' },
  disabledProviders: [] as string[],
  routerEnabled: true,
};

describe('Turno BYOK dentro del recorrido de Dante', () => {
  it('1. consulta permitida: pasa por el orquestador y llega UNA vez al ejecutor con el modelo vigente por defecto', async () => {
    let calls = 0;
    let receivedKey = '';
    let receivedPrompt = '';
    let receivedModel: string | undefined;

    const result = await runByokChatTurn({
      ...BASE,
      executor: async (input) => {
        calls += 1;
        receivedKey = input.apiKey;
        receivedPrompt = input.prompt;
        receivedModel = input.model;
        return { content: 'respuesta sintetica', model: input.model ?? DEFAULT_BYOK_GEMINI_MODEL };
      },
    });

    expect(result.status).toBe('ok');
    expect(calls).toBe(1);
    expect(receivedKey).toBe(BASE.apiKey);
    expect(receivedModel).toBe('gemini-3.8-flash');
    expect(receivedModel).not.toBe('gemini-2.0-flash');
    if (result.status === 'ok') {
      expect(result.orchestration.action).toBe('CONTEXT_LOADED_WAITING_LLM');
      expect(result.content).toBe('respuesta sintetica');
      expect(result.model).toBe('gemini-3.8-flash');
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

  it('clasifica cuota excedida del proveedor correctamente', async () => {
    const failure = Object.assign(new Error('resource_exhausted: quota exceeded'), { code: 'QUOTA_EXCEEDED' });
    const result = await runByokChatTurn({
      ...BASE,
      executor: async () => { throw failure; },
    });

    expect(result.status).toBe('provider_error');
    expect(result.code).toBe('QUOTA_EXCEEDED');
  });

  it('4. sin model explícito elige el default vigente aprobado (gemini-3.8-flash) y nunca gemini-2.0-flash', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(DEFAULT_BYOK_GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(PROVIDER_DEFAULT_GEMINI_MODEL).toBe(DEFAULT_GEMINI_MODEL);
    expect(ALLOWED_GEMINI_MODELS[0]).toBe(DEFAULT_GEMINI_MODEL);
    expect(ALLOWED_GEMINI_MODELS).not.toContain('gemini-2.0-flash');
    expect(resolveGeminiModel(undefined)).toBe('gemini-3.8-flash');
    expect(resolveGeminiModel('')).toBe('gemini-3.8-flash');
    expect(resolveGeminiModel('   ')).toBe('gemini-3.8-flash');
  });

  it('5. preserva un model permitido explícito (gemini-3.8-flash y gemini-3.5-flash-lite)', async () => {
    for (const allowedModel of ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const) {
      expect(isAllowedGeminiModel(allowedModel)).toBe(true);
      expect(resolveGeminiModel(allowedModel)).toBe(allowedModel);

      let capturedModel: string | undefined;
      const result = await runByokChatTurn({
        ...BASE,
        model: allowedModel,
        executor: async (input) => {
          capturedModel = input.model;
          return { content: 'ok', model: input.model! };
        },
      });

      expect(result.status).toBe('ok');
      expect(capturedModel).toBe(allowedModel);
      if (result.status === 'ok') {
        expect(result.model).toBe(allowedModel);
      }
    }
  });

  it('6. rechaza explícitamente overrides obsoletos o restringidos sin invocar al ejecutor ni al proveedor', async () => {
    const obsoleteModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ];

    for (const obsolete of obsoleteModels) {
      expect(isAllowedGeminiModel(obsolete)).toBe(false);
      expect(() => resolveGeminiModel(obsolete)).toThrow(InvalidGeminiModelError);

      let calls = 0;
      const turn = await runByokChatTurn({
        ...BASE,
        model: obsolete,
        executor: async () => {
          calls += 1;
          return { content: 'no debe llamarse', model: obsolete };
        },
      });

      expect(calls).toBe(0);
      expect(turn.status).toBe('provider_error');
      if (turn.status !== 'ok') {
        expect(turn.code).toBe('INVALID_MODEL');
        expect(turn.executionInvocations).toBe(0);
      }

      await expect(
        defaultByokExecutor({
          providerId: 'gemini',
          apiKey: BASE.apiKey,
          prompt: 'hola',
          model: obsolete,
        }),
      ).rejects.toThrow(InvalidGeminiModelError);
    }
  });

  it('7. rechaza DEFAULT_GEMINI_MODEL obsoleto en entorno tanto en BYOK como en GeminiProvider sin llamar al SDK', async () => {
    const prevDefaultModel = process.env.DEFAULT_GEMINI_MODEL;
    const prevGoogleKey = process.env.GOOGLE_AI_API_KEY;
    process.env.DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
    process.env.GOOGLE_AI_API_KEY = 'fake-test-key-no-network';

    try {
      let calls = 0;
      const turn = await runByokChatTurn({
        ...BASE,
        executor: async () => {
          calls += 1;
          return { content: 'no debe ejecutarse', model: 'gemini-2.0-flash' };
        },
      });
      expect(calls).toBe(0);
      expect(turn.status).toBe('provider_error');
      if (turn.status !== 'ok') {
        expect(turn.code).toBe('INVALID_MODEL');
      }

      const provider = new GeminiProvider();
      await expect(provider.execute('hola')).rejects.toMatchObject({
        code: 'INVALID_MODEL',
      });
    } finally {
      if (prevDefaultModel === undefined) {
        delete process.env.DEFAULT_GEMINI_MODEL;
      } else {
        process.env.DEFAULT_GEMINI_MODEL = prevDefaultModel;
      }
      if (prevGoogleKey === undefined) {
        delete process.env.GOOGLE_AI_API_KEY;
      } else {
        process.env.GOOGLE_AI_API_KEY = prevGoogleKey;
      }
    }
  });

  it('soporta multi-proveedores BYOK (nvidia, groq, openrouter, huggingface) entregando la clave solo al ejecutor', async () => {
    for (const provider of ['nvidia', 'groq', 'openrouter', 'huggingface'] as const) {
      let executorCalled = false;
      let usedProvider = '';
      let usedKey = '';

      const turn = await runByokChatTurn({
        providerId: provider,
        apiKey: `test-${provider}-key`,
        messages: [{ role: 'user', content: 'analiza arquitectura' }],
        financialContext: { timezone: 'UTC', locale: 'es-CL', userId: 'user-a' },
        disabledProviders: [],
        routerEnabled: true,
        executor: async (input) => {
          executorCalled = true;
          usedProvider = input.providerId;
          usedKey = input.apiKey;
          return { content: `Respuesta de ${provider}`, model: `model-${provider}` };
        },
      });

      expect(turn.status).toBe('ok');
      expect(executorCalled).toBe(true);
      expect(usedProvider).toBe(provider);
      expect(usedKey).toBe(`test-${provider}-key`);
      if (turn.status === 'ok') {
        expect(turn.content).toBe(`Respuesta de ${provider}`);
      }
    }
  });
});
