import { NextRequest } from 'next/server';
import { GET as getLogs } from '../../src/app/api/logs/route';
import { GET as getAnalytics } from '../../src/app/api/analytics/route';

const VALID_TOKEN = 'test-core-token-analytics';

describe('/api/logs & /api/analytics — Mock Elimination & Transparency', () => {
  const originalEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DANTE_CORE_TOKEN = VALID_TOKEN;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('GET /api/logs', () => {
    it('1. When database is NOT enabled, reports truthful status rather than fake connection established', async () => {
      delete process.env.USE_DATABASE;
      delete process.env.DATABASE_URL;

      const req = new NextRequest('http://localhost:3001/api/logs', {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
      });

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      const memoryLog = data.logs.find((l: any) => l.module === 'memoria');
      expect(memoryLog).toBeDefined();
      expect(memoryLog.level).toBe('warn');
      expect(memoryLog.message).not.toContain('Conexión a NeonDB establecida.');
      expect(memoryLog.message).toContain('no habilitada');
    });

    it('2. When database is enabled with DATABASE_URL, logs real configured state', async () => {
      process.env.USE_DATABASE = 'true';
      process.env.DATABASE_URL = 'postgres://user:pass@ep-neon.tech/neondb';

      const req = new NextRequest('http://localhost:3001/api/logs', {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
      });

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      const memoryLog = data.logs.find((l: any) => l.module === 'memoria');
      expect(memoryLog?.level).toBe('info');
      expect(memoryLog?.message).toContain('USE_DATABASE=true');
    });
  });

  describe('GET /api/analytics', () => {
    it('3. When USE_DATABASE is disabled, returns 400 DATABASE_DISABLED', async () => {
      delete process.env.USE_DATABASE;

      const req = new NextRequest('http://localhost:3001/api/analytics', {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
      });

      const res = await getAnalytics(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('DATABASE_DISABLED');
    });

    it('4. When database is enabled, reports averageLatencyMs as 0 (unmeasured) instead of hardcoded 125ms dummy', async () => {
      process.env.USE_DATABASE = 'true';
      process.env.DATABASE_URL = 'postgres://user:pass@ep-neon.tech/neondb';

      // Mock database query to return count rows
      const dbModule = await import('../../src/lib/database');
      jest.spyOn(dbModule, 'query').mockImplementation(async (sql: string) => {
        if (sql.includes('conversations')) {
          return { rows: [{ count: '5' }] } as any;
        }
        if (sql.includes('messages')) {
          return { rows: [{ count: '20' }] } as any;
        }
        return { rows: [] } as any;
      });

      const req = new NextRequest('http://localhost:3001/api/analytics', {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
      });

      const res = await getAnalytics(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.totalConversations).toBe(5);
      expect(data.totalMessages).toBe(20);
      expect(data.averageLatencyMs).toBe(0);
      expect(data.averageLatencyMs).not.toBe(125);
    });
  });
});
