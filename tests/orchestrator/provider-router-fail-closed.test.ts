import { ProviderRouter } from '../../src/orchestrator/provider-router';
import { AIProvider, ProviderResponse, ProviderError } from '../../src/orchestrator/providers/types';

describe('ProviderRouter — Mock Fallback Elimination & Fail-Closed Security', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('isProductionOrPreview detection', () => {
    it('1. Correctly detects production and preview environments', () => {
      const router = new ProviderRouter();
      expect(router.isProductionOrPreview({ NODE_ENV: 'production' })).toBe(true);
      expect(router.isProductionOrPreview({ VERCEL_ENV: 'preview' })).toBe(true);
      expect(router.isProductionOrPreview({ VERCEL_ENV: 'production' })).toBe(true);
      expect(router.isProductionOrPreview({ VERCEL: '1' })).toBe(true);
      expect(router.isProductionOrPreview({ NODE_ENV: 'development' })).toBe(false);
      expect(router.isProductionOrPreview({ NODE_ENV: 'test' })).toBe(false);
      expect(router.isProductionOrPreview({})).toBe(false);
    });
  });

  describe('Production Fail-Closed Guarantees', () => {
    it('2. In production, mock provider is never active and canUseProvider returns false', () => {
      process.env.NODE_ENV = 'production';
      const router = new ProviderRouter();

      const statuses = router.getProvidersStatus();
      const mockStatus = statuses.find((p) => p.id === 'mock');
      expect(mockStatus?.is_active).toBe(false);
    });

    it('3. In production, selectProvider throws fail-closed error when no real providers are available', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GOOGLE_AI_API_KEY;
      delete process.env.HUGGING_FACE_API_KEY;
      delete process.env.OLLAMA_BASE_URL;

      const router = new ProviderRouter();
      // Ensure all real providers are disabled
      router.setProviderEnabled('gemini', false);
      router.setProviderEnabled('huggingface', false);
      router.setProviderEnabled('ollama', false);

      expect(() => {
        router.selectProvider('test prompt');
      }).toThrow('No active AI providers available in production/preview environment');
    });

    it('4. In production, provider failure in executeWithFallback throws rather than falling back to mock', async () => {
      process.env.NODE_ENV = 'production';
      const router = new ProviderRouter();

      // Mock a failing Gemini provider
      const failingGemini: AIProvider = {
        id: 'gemini',
        name: 'Failing Gemini Provider',
        category: 'reasoning',
        isActive: () => true,
        execute: jest.fn().mockRejectedValue(new Error('Gemini API Quota Exceeded')),
      };

      // Mock failing HF and Ollama
      const failingHf: AIProvider = {
        id: 'huggingface',
        name: 'Failing HF Provider',
        category: 'fast',
        isActive: () => true,
        execute: jest.fn().mockRejectedValue(new Error('Hugging Face Service Unavailable')),
      };

      const failingOllama: AIProvider = {
        id: 'ollama',
        name: 'Failing Ollama Provider',
        category: 'local',
        isActive: () => true,
        execute: jest.fn().mockRejectedValue(new Error('Ollama connection refused')),
      };

      (router as any).providers.set('gemini', failingGemini);
      (router as any).providers.set('huggingface', failingHf);
      (router as any).providers.set('ollama', failingOllama);

      // In production, executeWithFallback MUST throw the error, NOT return mock
      await expect(router.executeWithFallback('test query')).rejects.toThrow();

      // Verify that mock provider was never executed
      const mockProvider = (router as any).providers.get('mock');
      const mockExecuteSpy = jest.spyOn(mockProvider, 'execute');
      expect(mockExecuteSpy).not.toHaveBeenCalled();
    });

    it('5. In production, rotateProvider throws when all real providers are exhausted', () => {
      process.env.NODE_ENV = 'production';
      const router = new ProviderRouter();

      // Disable other real providers so rotation cannot find another provider
      router.setProviderEnabled('huggingface', false);
      router.setProviderEnabled('ollama', false);

      const authError: ProviderError = new Error('Invalid Gemini Key') as ProviderError;
      authError.code = 'AUTH_ERROR';

      expect(() => {
        router.rotateProvider('gemini', authError);
      }).toThrow('Invalid Gemini Key');
    });
  });

  describe('Non-production fallback behavior', () => {
    it('6. In development/test environment, mock fallback is permitted when no real providers exist', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;

      const router = new ProviderRouter();
      // Disable real providers
      router.setProviderEnabled('gemini', false);
      router.setProviderEnabled('huggingface', false);
      router.setProviderEnabled('ollama', false);

      const result = await router.executeWithFallback('test fallback');
      expect(result.providerId).toBe('mock');
      expect(result.response.content).toContain('[Fallback Mock]');
    });
  });
});
