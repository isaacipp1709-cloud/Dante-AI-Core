import { AIProvider, ProviderResponse, ProviderError } from './providers/types';
import { GeminiProvider } from './providers/gemini';
import { HuggingFaceProvider } from './providers/huggingface';
import { OllamaProvider } from './providers/ollama';
import { MockProvider } from './providers/mock';
// Import local audit logger (stub or real depending on what Core has)
// To keep it clean, we log to stdout which Vercel/NextJS captures, or we could insert into Neon later.

interface RotationLog {
  timestamp: string;
  originalProvider: string;
  newProvider: string;
  reason: string;
}

export class ProviderRouter {
  private providers: Map<string, AIProvider> = new Map();
  private rotationHistory: RotationLog[] = [];
  private disabledProviders: Set<string> = new Set(); // For AUTH_ERRORs
  
  // Rule: Priority order
  private priorityOrder = ['gemini', 'huggingface', 'ollama'];

  constructor() {
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new HuggingFaceProvider());
    this.registerProvider(new OllamaProvider());
    this.registerProvider(new MockProvider());
  }

  private registerProvider(provider: AIProvider) {
    this.providers.set(provider.id, provider);
  }

  // Exposed for /api/providers/status
  public getProvidersStatus() {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      is_active: p.isActive() && !this.disabledProviders.has(p.id)
    }));
  }

  public getRotationHistory() {
    return this.rotationHistory;
  }

  // 1. Select provider based on context
  public selectProvider(query: string): AIProvider {
    const q = query.toLowerCase();
    let preferredId = 'gemini'; // Default for Reasoning

    if (q.includes('resume') || q.includes('clasifica') || q.includes('analiza texto')) {
      preferredId = 'huggingface';
    } else if (q.includes('local') || q.includes('offline') || q.includes('terminal')) {
      preferredId = 'ollama';
    }

    // Ensure preferred is active and not auth-disabled. If not, fallback to priority list.
    if (!this.canUseProvider(preferredId)) {
      preferredId = this.getNextAvailableProvider();
    }

    return this.providers.get(preferredId) || this.providers.get('mock')!;
  }

  private canUseProvider(id: string): boolean {
    const p = this.providers.get(id);
    return !!p && p.isActive() && !this.disabledProviders.has(id);
  }

  private getNextAvailableProvider(excludeId?: string): string {
    for (const id of this.priorityOrder) {
      if (id !== excludeId && this.canUseProvider(id)) {
        return id;
      }
    }
    return 'mock';
  }

  // 2. Rotate provider
  public rotateProvider(currentProviderId: string, error: ProviderError): AIProvider {
    if (error.code === 'AUTH_ERROR') {
      this.disabledProviders.add(currentProviderId);
    }
    
    const nextId = this.getNextAvailableProvider(currentProviderId);
    
    // Log rotation
    const log: RotationLog = {
      timestamp: new Date().toISOString(),
      originalProvider: currentProviderId,
      newProvider: nextId,
      reason: error.code || 'UNKNOWN'
    };
    this.rotationHistory.unshift(log);
    if (this.rotationHistory.length > 10) this.rotationHistory.pop();
    
    console.warn(`[ProviderRouter] Rotando de ${currentProviderId} a ${nextId}. Motivo: ${error.code} - ${error.message}`);
    
    return this.providers.get(nextId)!;
  }

  // 3. Execute with fallback
  public async executeWithFallback(prompt: string, history?: { role: string; content: string }[]): Promise<{ response: ProviderResponse, providerId: string }> {
    let currentProvider = this.selectProvider(prompt);
    
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`[ProviderRouter] Ejecutando con ${currentProvider.id}`);
        // Add a safety timeout wrapper (10s)
        const response = await this.executeWithTimeout(currentProvider, prompt, history, 10000);
        return { response, providerId: currentProvider.id };
      } catch (err: any) {
        attempts++;
        const pErr = err as ProviderError;
        
        // If it's already the mock provider and it failed (unlikely), just break
        if (currentProvider.id === 'mock') {
          break;
        }

        if (attempts >= maxAttempts) {
          console.error(`[ProviderRouter] Fallaron todos los reintentos. Forzando mock.`);
          currentProvider = this.providers.get('mock')!;
          continue;
        }

        // Rotate
        currentProvider = this.rotateProvider(currentProvider.id, pErr);
      }
    }

    // Ultimate fallback
    const mockProvider = this.providers.get('mock')!;
    const response = await mockProvider.execute(prompt);
    return { response, providerId: 'mock' };
  }

  private executeWithTimeout(provider: AIProvider, prompt: string, history: any, ms: number): Promise<ProviderResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('Timeout de 10s excedido') as ProviderError;
        err.code = 'TIMEOUT';
        reject(err);
      }, ms);
      
      provider.execute(prompt, history).then(res => {
        clearTimeout(timer);
        resolve(res);
      }).catch(err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}

// Singleton export
export const providerRouter = new ProviderRouter();
