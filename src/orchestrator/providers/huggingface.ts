import { AIProvider, ProviderResponse, ProviderError } from './types';

export class HuggingFaceProvider implements AIProvider {
  id = 'huggingface';
  name = 'Hugging Face API';
  category = 'analisis' as const;
  
  isActive(): boolean {
    return !!process.env.HUGGING_FACE_API_KEY;
  }

  async execute(prompt: string, history?: { role: string; content: string }[]): Promise<ProviderResponse> {
    if (!this.isActive()) {
       const err = new Error('HUGGING_FACE_API_KEY no configurado') as ProviderError;
       err.code = 'AUTH_ERROR';
       throw err;
    }
    
    try {
      const model = 'mistralai/Mistral-7B-Instruct-v0.2'; // General text model suitable for chat
      
      const fullPrompt = history 
        ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + `\n\nUSER: ${prompt}`
        : prompt;

      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: fullPrompt,
          parameters: { max_new_tokens: 250, return_full_text: false }
        }),
      });
      
      if (!response.ok) {
         const err = new Error(`HF API Error: ${response.statusText}`) as ProviderError;
         if (response.status === 429) err.code = 'QUOTA_EXCEEDED';
         else if (response.status === 401 || response.status === 403) err.code = 'AUTH_ERROR';
         else if (response.status >= 500 || response.status === 503) err.code = 'SERVER_ERROR';
         else err.code = 'UNKNOWN';
         throw err;
      }
      
      const data = await response.json();
      const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      
      return {
        content: text || "Respuesta vacía de HuggingFace",
        model: model
      };
    } catch (error: any) {
      if ((error as ProviderError).code) throw error;
      const err = new Error(error.message) as ProviderError;
      err.code = error.name === 'AbortError' || error.message.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN';
      throw err;
    }
  }
}
