import { createConversation, saveMessage, getConversationMessages } from '../../src/lib/database';
import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/chat/route';

jest.mock('../../src/lib/database', () => ({
  createConversation: jest.fn(),
  saveMessage: jest.fn(),
  getConversationMessages: jest.fn(),
}));

// Mock the DanteOrchestrator to avoid deep dependency testing
jest.mock('../../src/orchestrator', () => {
  return {
    DanteOrchestrator: jest.fn().mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        action: 'RESPOND',
        payload: { text: 'Test response' },
      }),
    })),
  };
});

describe('Database Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USE_DATABASE = 'true';
    process.env.DANTE_CORE_TOKEN = 'test-token';
  });

  afterAll(() => {
    delete process.env.USE_DATABASE;
    delete process.env.DANTE_CORE_TOKEN;
  });

  it('1. Guardar conversacion -> existe en DB (mocked)', async () => {
    (createConversation as jest.Mock).mockResolvedValueOnce([{ id: 'uuid-1', external_id: 'local-123' }]);
    
    const res = await createConversation('local-123');
    expect(res).toBeDefined();
    expect(res[0].id).toBe('uuid-1');
  });

  it('2. Guardar mensaje -> existe en DB (mocked)', async () => {
    (saveMessage as jest.Mock).mockResolvedValueOnce([{ id: 'msg-1' }]);
    
    const res = await saveMessage('uuid-1', 'user', 'hello', 'req-1');
    expect(res).toBeDefined();
    expect(res[0].id).toBe('msg-1');
  });

  it('3. Fallo de DB -> no bloquea respuesta (error loggeado)', async () => {
    (createConversation as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const request = new NextRequest('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-token',
        'x-conversation-id': 'local-123'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test message' }]
      })
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith('Persistencia falló:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});
