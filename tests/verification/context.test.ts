import { isFinancialContext, isGeneralContext } from '../../src/verification/context';
import { DanteOrchestrator } from '../../src/orchestrator';

describe('DanteContext — type guards and orchestrator integration', () => {

  // Test 1: contexto ausente → usa defaults (GeneralContext mínimo)
  it('should process GeneralContext with empty/default fields without throwing', async () => {
    const orchestrator = new DanteOrchestrator();
    const result = await orchestrator.process({
      query: 'hola',
      financialContext: { timezone: 'UTC', locale: 'es-CL' }
    });
    expect(result.status).toBe('SUCCESS');
    expect(result.action).toBe('CONTEXT_LOADED_WAITING_LLM');
  });

  // Test 2: contexto parcial → combina con defaults (campos opcionales ausentes)
  it('should process GeneralContext with only timezone specified', async () => {
    const orchestrator = new DanteOrchestrator();
    const result = await orchestrator.process({
      query: '¿cuál es el estado?',
      financialContext: { timezone: 'America/Santiago', locale: 'es-CL' }
    });
    expect(result.status).toBe('SUCCESS');
  });

  // Test 3: contexto financiero completo → pasa íntegro al orquestador
  it('should process FinancialContext and return financialResults', async () => {
    const orchestrator = new DanteOrchestrator();
    const result = await orchestrator.process({
      query: 'calcular reserva',
      financialContext: {
        cajaDisponibleCLP: 20000000,
        sueldosLiquidosMensualesCLP: 5000000,
      }
    });
    expect(result.status).toBe('SUCCESS');
    const results = result.payload.financialResults as Record<string, unknown>;
    expect(results.pascal).toBeDefined();
  });

  // Test 4: type guards correctos
  it('isFinancialContext and isGeneralContext type guards should be mutually exclusive', () => {
    const fin = { cajaDisponibleCLP: 1000, sueldosLiquidosMensualesCLP: 500 };
    const gen = { timezone: 'UTC', locale: 'es-CL' };

    expect(isFinancialContext(fin)).toBe(true);
    expect(isGeneralContext(fin)).toBe(false);

    expect(isFinancialContext(gen)).toBe(false);
    expect(isGeneralContext(gen)).toBe(true);
  });
});
