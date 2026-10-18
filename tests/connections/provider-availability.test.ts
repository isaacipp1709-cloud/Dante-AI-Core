import { isProviderExecutionBlocked } from '../../src/orchestrator/connections/provider-availability';

describe('Interruptor por proveedor', () => {
  it('bloquea cuando el proveedor figura desactivado en el store', () => {
    expect(isProviderExecutionBlocked({ providerId: 'gemini', disabled: ['gemini'], routerEnabled: true })).toBe(true);
  });

  it('bloquea cuando el runtime lo tiene desactivado', () => {
    expect(isProviderExecutionBlocked({ providerId: 'gemini', disabled: [], routerEnabled: false })).toBe(true);
  });

  it('permite ejecutar solo si el store y el runtime lo habilitan', () => {
    expect(isProviderExecutionBlocked({ providerId: 'gemini', disabled: [], routerEnabled: true })).toBe(false);
    expect(isProviderExecutionBlocked({ providerId: 'gemini', disabled: ['groq'], routerEnabled: true })).toBe(false);
  });
});
