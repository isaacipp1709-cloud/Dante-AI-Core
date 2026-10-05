import { AIProvider, ProviderResponse, ProviderError } from './types';

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama Local';
  category = 'local' as const;
  
  isActive(): boolean {
    return !!process.env.OLLAMA_BASE_URL;
  }

  async execute(prompt: string, history?: { role: string; content: string }[]): Promise<ProviderResponse> {
    if (!this.isActive()) {
       const err = new Error('OLLAMA_BASE_URL no configurado') as ProviderError;
       err.code = 'AUTH_ERROR';
       throw err;
    }
    
    try {
      const baseUrl = process.env.OLLAMA_BASE_URL;
      const model = 'llama3'; 
      
      const messages = history ? [...history, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      
      if (!response.ok) {
         const err = new Error(`Ollama Error: ${response.statusText}`) as ProviderError;
         if (response.status >= 500) err.code = 'SERVER_ERROR';
         else err.code = 'UNKNOWN';
         throw err;
      }
      
      const data = await response.json();
      
      return {
        content: data.message?.content || "Respuesta vacía de Ollama",
        model: model,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        }
      };
    } catch (error: any) {
      if ((error as ProviderError).code) throw error;
      const err = new Error(error.message) as ProviderError;
      err.code = error.name === 'AbortError' || error.message.includes('fetch') ? 'TIMEOUT' : 'UNKNOWN';
      throw err;
    }
  }
}
