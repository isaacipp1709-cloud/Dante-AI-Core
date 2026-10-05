import { AIProvider, ProviderResponse } from './types';

export class MockProvider implements AIProvider {
  id = 'mock';
  name = 'Mock Local';
  category = 'mock' as const;
  
  isActive(): boolean {
    return true; // Siempre activo como fallback
  }

  async execute(prompt: string): Promise<ProviderResponse> {
    return {
      content: `[Fallback Mock] No pude conectarme a mis proveedores ahora, pero estoy aquí. ¿En qué más puedo ayudarte? (Tu mensaje: "${prompt}")`,
      model: 'mock-dante',
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    };
  }
}
