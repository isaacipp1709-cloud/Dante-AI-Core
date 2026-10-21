import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProviderNotSupportedError } from './credential-service';

/**
 * Ejecucion con la credencial resuelta del propietario.
 * La clave vive solo durante la solicitud: no se registra ni se devuelve.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_BYOK_GEMINI_MODEL = DEFAULT_GEMINI_MODEL;

/**
 * Modelos Gemini API vigentes aprobados con nivel gratuito estándar documentado.
 * Ordenados para que la selección inicial sea el default aprobado (gemini-3.8-flash).
 */
export const ALLOWED_GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
  'gemini-3.5-flash-lite',
] as const;

export type AllowedGeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

export class InvalidGeminiModelError extends Error {
  readonly code = 'INVALID_MODEL';
  readonly requestedModel: string;

  constructor(requestedModel: string) {
    super(
      `El modelo Gemini '${requestedModel}' está obsoleto o no está permitido. Modelos permitidos: ${ALLOWED_GEMINI_MODELS.join(', ')}.`,
    );
    this.name = 'InvalidGeminiModelError';
    this.requestedModel = requestedModel;
  }
}

export function isAllowedGeminiModel(model: string): model is AllowedGeminiModel {
  return (ALLOWED_GEMINI_MODELS as readonly string[]).includes(model);
}

/**
 * Resuelve y valida el modelo Gemini efectivo.
 * - Si se proporciona un override explícito, debe pertenecer a ALLOWED_GEMINI_MODELS.
 * - Si no se proporciona override explícito, usa process.env.DEFAULT_GEMINI_MODEL (validado)
 *   o DEFAULT_BYOK_GEMINI_MODEL ('gemini-3.8-flash').
 * - Nunca acepta silenciosamente un modelo obsoleto (p. ej. gemini-2.0-flash) ni degrada en silencio.
 */
export function resolveGeminiModel(requestedModel?: string | null): AllowedGeminiModel {
  const explicit = typeof requestedModel === 'string' ? requestedModel.trim() : '';
  if (explicit.length > 0) {
    if (!isAllowedGeminiModel(explicit)) {
      throw new InvalidGeminiModelError(explicit);
    }
    return explicit;
  }

  const envDefault =
    typeof process.env.DEFAULT_GEMINI_MODEL === 'string'
      ? process.env.DEFAULT_GEMINI_MODEL.trim()
      : '';
  if (envDefault.length > 0) {
    if (!isAllowedGeminiModel(envDefault)) {
      throw new InvalidGeminiModelError(envDefault);
    }
    return envDefault;
  }

  return DEFAULT_BYOK_GEMINI_MODEL;
}

export interface OpenAiCompatibleConfig {
  endpoint: string;
  defaultModel: string;
  extraHeaders?: Record<string, string>;
}

export const OPENAI_COMPATIBLE_PROVIDERS: Record<string, OpenAiCompatibleConfig> = {
  deepseek: {
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  nvidia: {
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'meta/llama-3.1-70b-instruct',
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    extraHeaders: {
      'HTTP-Referer': 'https://la-casa-de-dante.vercel.app',
      'X-Title': 'La Casa de Dante',
    },
  },
  huggingface: {
    endpoint: 'https://router.huggingface.co/hf-inference/v1/chat/completions',
    defaultModel: 'meta-llama/Meta-Llama-3-8B-Instruct',
  },
};

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
  // Proveedores compatibles con OpenAI chat completions wire protocol
  const openAiConfig = OPENAI_COMPATIBLE_PROVIDERS[input.providerId];
  if (openAiConfig) {
    const modelName = input.model && input.model.trim().length > 0 ? input.model.trim() : openAiConfig.defaultModel;
    const messages = [
      ...(input.history || []).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: m.content,
      })),
      { role: 'user', content: input.prompt },
    ];

    try {
      const res = await fetch(openAiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
          ...(openAiConfig.extraHeaders || {}),
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        let code = 'PROVIDER_ERROR';
        if (res.status === 429) {
          code = 'QUOTA_EXCEEDED';
        } else if (res.status === 401 || res.status === 403) {
          code = 'AUTH_ERROR';
        } else if (res.status === 408 || res.status === 504) {
          code = 'TIMEOUT';
        }
        const err = new Error('El proveedor devolvio un error.');
        (err as unknown as { code: string }).code = code;
        throw err;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '';
      return {
        content,
        model: modelName,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens ?? 0,
              completion_tokens: data.usage.completion_tokens ?? 0,
              total_tokens: data.usage.total_tokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      if ((error as { code?: string }).code) throw error;
      const err = new Error('El proveedor devolvio un error.');
      (err as unknown as { code: string }).code = 'PROVIDER_ERROR';
      throw err;
    }
  }

  // Google Gemini nativo
  if (input.providerId !== 'gemini') {
    throw new ProviderNotSupportedError();
  }

  const modelName = resolveGeminiModel(input.model);
  const genAI = new GoogleGenerativeAI(input.apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const fullPrompt = input.history && input.history.length > 0
    ? input.history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + `\n\nUSER: ${input.prompt}`
    : input.prompt;

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 0;
    let code = 'PROVIDER_ERROR';
    if (status === 429 || message.includes('quota') || message.includes('rate limit') || message.includes('resource_exhausted')) {
      code = 'QUOTA_EXCEEDED';
    } else if (status === 400 || status === 401 || status === 403 || message.includes('api key') || message.includes('api_key') || message.includes('permission') || message.includes('unauthorized') || message.includes('invalid argument')) {
      code = 'AUTH_ERROR';
    } else if (status === 408 || status === 504 || message.includes('timeout') || message.includes('timed out')) {
      code = 'TIMEOUT';
    }
    const sanitised = new Error('El proveedor devolvio un error.');
    (sanitised as unknown as { code: string }).code = code;
    throw sanitised;
  }
};
