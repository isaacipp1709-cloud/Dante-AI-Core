import { AIProvider, ProviderResponse, ProviderError } from './types';

// Requiere: npm install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  DEFAULT_GEMINI_MODEL,
  resolveGeminiModel,
} from '../credentials/byok-executor';

export { DEFAULT_GEMINI_MODEL };

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini';
  category = 'razonamiento' as const;
  
  isActive(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  async execute(prompt: string, history?: { role: string; content: string }[]): Promise<ProviderResponse> {
    if (!this.isActive()) {
       const err = new Error('GOOGLE_AI_API_KEY no configurado') as ProviderError;
       err.code = 'AUTH_ERROR';
       throw err;
    }

    const modelName = resolveGeminiModel(process.env.DEFAULT_GEMINI_MODEL);
    
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const fullPrompt = history 
        ? history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + `\n\nUSER: ${prompt}`
        : prompt;
        
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      
      return {
        content: text,
        model: modelName,
        usage: result.response.usageMetadata ? {
          prompt_tokens: result.response.usageMetadata.promptTokenCount || 0,
          completion_tokens: result.response.usageMetadata.candidatesTokenCount || 0,
          total_tokens: result.response.usageMetadata.totalTokenCount || 0
        } : undefined
      };
    } catch (error: any) {
      const err = new Error(error.message) as ProviderError;
      if (error.status === 429) err.code = 'QUOTA_EXCEEDED';
      else if (error.status === 401 || error.status === 403) err.code = 'AUTH_ERROR';
      else if (error.status >= 500) err.code = 'SERVER_ERROR';
      else err.code = 'UNKNOWN';
      throw err;
    }
  }
}
