export interface ProviderResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
}

export interface ProviderError extends Error {
  code: 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'AUTH_ERROR' | 'SERVER_ERROR' | 'UNKNOWN';
}

export interface AIProvider {
  id: string;
  name: string;
  category: 'razonamiento' | 'analisis' | 'local' | 'mock';
  isActive(): boolean;
  execute(prompt: string, history?: { role: string; content: string }[]): Promise<ProviderResponse>;
}
