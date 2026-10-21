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
  private adminDisabledProviders: Set<string> = new Set(); // Toggle del panel de conexiones
  
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

  public isProductionOrPreview(env: NodeJS.ProcessEnv = process.env): boolean {
    return (
      env.NODE_ENV === 'production' ||
      env.VERCEL === '1' ||
      env.VERCEL_ENV === 'preview' ||
      env.VERCEL_ENV === 'production'
    );
  }

  // Exposed for /api/providers/status
  public getProvidersStatus() {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      is_active: this.canUseProvider(p.id)
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
      const nextId = this.getNextAvailableProvider();
      if (!nextId) {
        if (this.isProductionOrPreview()) {
          throw new Error('No active AI providers available in production/preview environment');
        }
        preferredId = 'mock';
      } else {
        preferredId = nextId;
      }
    }

    const provider = this.providers.get(preferredId);
    if (!provider || (provider.id === 'mock' && this.isProductionOrPreview())) {
      throw new Error('No active AI providers available in production/preview environment');
    }

    return provider;
  }

  /** Ids de proveedores registrados (para el panel de conexiones). */
  public getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  public hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Activa o desactiva un proveedor desde el panel de conexiones.
   * NO toca credenciales: solo impide su uso mientras este desactivado.
   */
  public setProviderEnabled(id: string, enabled: boolean): void {
    if (enabled) {
      this.adminDisabledProviders.delete(id);
    } else {
      this.adminDisabledProviders.add(id);
    }
  }

  public isProviderEnabled(id: string): boolean {
    return !this.adminDisabledProviders.has(id);
  }

  private canUseProvider(id: string): boolean {
    if (id === 'mock' && this.isProductionOrPreview()) {
      return false;
    }
    const p = this.providers.get(id);
    return !!p && p.isActive() && !this.disabledProviders.has(id) && !this.adminDisabledProviders.has(id);
  }

  private getNextAvailableProvider(excludeId?: string): string | null {
    for (const id of this.priorityOrder) {
      if (id !== excludeId && this.canUseProvider(id)) {
        return id;
      }
    }
    if (!this.isProductionOrPreview() && this.canUseProvider('mock')) {
      return 'mock';
    }
    return null;
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
      newProvider: nextId || 'none',
      reason: error.code || 'UNKNOWN'
    };
    this.rotationHistory.unshift(log);
    if (this.rotationHistory.length > 10) this.rotationHistory.pop();
    
    console.warn(`[ProviderRouter] Rotando de ${currentProviderId} a ${nextId || 'none'}. Motivo: ${error.code} - ${error.message}`);
    
    if (!nextId) {
      throw error || new Error(`No fallback provider available after ${currentProviderId} failure`);
    }

    const nextProvider = this.providers.get(nextId);
    if (!nextProvider || (nextProvider.id === 'mock' && this.isProductionOrPreview())) {
      throw error || new Error(`No fallback provider available after ${currentProviderId} failure in production`);
    }

    return nextProvider;
  }

  // 3. Execute with fallback
  public async executeWithFallback(prompt: string, history?: { role: string; content: string }[]): Promise<{ response: ProviderResponse, providerId: string }> {
    let currentProvider: AIProvider;
    try {
      currentProvider = this.selectProvider(prompt);
    } catch (err) {
      if (this.isProductionOrPreview()) {
        throw err;
      }
      currentProvider = this.providers.get('mock')!;
    }
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | ProviderError | null = null;

    while (attempts < maxAttempts) {
      try {
        console.log(`[ProviderRouter] Ejecutando con ${currentProvider.id}`);
        // Add a safety timeout wrapper (10s)
        const response = await this.executeWithTimeout(currentProvider, prompt, history, 10000);
        return { response, providerId: currentProvider.id };
      } catch (err: any) {
        attempts++;
        const pErr = err as ProviderError;
        lastError = pErr;

        if (this.isProductionOrPreview()) {
          // In production or preview: never rotate to mock, fail closed immediately if attempts exceeded
          if (attempts >= maxAttempts) {
            console.error(`[ProviderRouter] Fallaron todos los reintentos en producción. Falla cerrada (fail-closed).`);
            throw (lastError || new Error('All AI providers failed in production'));
          }
          currentProvider = this.rotateProvider(currentProvider.id, pErr);
          continue;
        }

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

    if (this.isProductionOrPreview()) {
      throw (lastError || new Error('All AI providers failed in production'));
    }

    // Ultimate fallback only in non-production environments
    const mockProvider = this.providers.get('mock');
    if (!mockProvider) {
      throw (lastError || new Error('All AI providers failed and mock provider is not available'));
    }
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
