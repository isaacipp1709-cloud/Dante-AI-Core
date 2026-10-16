import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProviderNotSupportedError } from './credential-service';

/**
 * Ejecucion con la credencial resuelta del propietario.
 * La clave vive solo durante la solicitud: no se registra ni se devuelve.
 */

export const DEFAULT_BYOK_GEMINI_MODEL = 'gemini-1.5-flash';

export interface ByokExecutionInput {
  providerId: string;
  apiKey: string;
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  model?: string;
}

export interface ByokExecutionResult {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export type ByokExecutor = (input: ByokExecutionInput) => Promise<ByokExecutionResult>;

export const defaultByokExecutor: ByokExecutor = async (input) => {
  if (input.providerId !== 'gemini') throw new ProviderNotSupportedError();

  const genAI = new GoogleGenerativeAI(input.apiKey);
  const modelName = input.model && input.model.trim().length > 0 ? input.model.trim() : DEFAULT_BYOK_GEMINI_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });

  const fullPrompt = input.history && input.history.length > 0
    ? input.history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + `\n\nUSER: ${input.prompt}`
    : input.prompt;

  const result = await model.generateContent(fullPrompt);
  const usage = result.response.usageMetadata;
  return {
    content: result.response.text(),
    model: modelName,
    usage: usage
      ? {
          prompt_tokens: usage.promptTokenCount ?? 0,
          completion_tokens: usage.candidatesTokenCount ?? 0,
          total_tokens: usage.totalTokenCount ?? 0,
        }
      : undefined,
  };
};
