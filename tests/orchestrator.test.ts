import { DanteOrchestrator } from '../src/orchestrator';
import { FinancialMath } from '../src/math/financial';
import { MathPrecisionError } from '../src/errors/DanteErrors';

describe('DanteOrchestrator', () => {
  let orchestrator: DanteOrchestrator;

  beforeEach(() => {
    orchestrator = new DanteOrchestrator(process.cwd());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Falla por input inválido de Zod', async () => {
    const res = await orchestrator.process({
      query: 'Hola',
      financialContext: { cajaDisponibleCLP: 10.5 } as any
    });
    expect(res.status).toBe('SYSTEM_ERROR');
    expect(res.action).toBe('INVALID_INPUT');
  });

  it('Ejecuta flujos exitosos', async () => {
    const res = await orchestrator.process({
      query: 'Quiero calcular el IVA',
      financialContext: {
        cajaDisponibleCLP: 5000000,
        sueldosLiquidosMensualesCLP: 2000000,
        ventasNetasCLP: 1000000,
        comprasNetasCLP: 500000
      }
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.payload.financialResults.iva.saldoAPagarCLP).toBe(95000);
    expect(res.payload.financialResults.pascal.semaforoSolvencia).toBe('VERDE');
  });

  it('Lanza GuardrailViolationError', async () => {
    const res = await orchestrator.process({
      query: 'las vacas vuelan',
      financialContext: {
        cajaDisponibleCLP: 5000000,
        sueldosLiquidosMensualesCLP: 2000000
      }
    });

    expect(res.status).toBe('GUARDRAIL_REJECTED');
  });

  it('Maneja un error general del sistema (no tipado)', async () => {
    jest.spyOn(FinancialMath, 'checkPascalReserve').mockImplementationOnce(() => {
      throw new Error('Error catastrófico de CPU');
    });
    const res = await orchestrator.process({
      query: 'Hola',
      financialContext: { cajaDisponibleCLP: 10, sueldosLiquidosMensualesCLP: 5 }
    });
    expect(res.status).toBe('SYSTEM_ERROR');
    expect(res.action).toBe('CRITICAL_HALT');
  });

  it('Lanza Math_Error por falla de precisión', async () => {
    jest.spyOn(FinancialMath, 'checkPascalReserve').mockImplementationOnce(() => {
      throw new MathPrecisionError('Error matemático');
    });
    const res = await orchestrator.process({
      query: 'Hola',
      financialContext: { cajaDisponibleCLP: 10, sueldosLiquidosMensualesCLP: 5 }
    });
    expect(res.status).toBe('MATH_ERROR');
    expect(res.action).toBe('CORRECTION_REQUIRED');
  });
});
