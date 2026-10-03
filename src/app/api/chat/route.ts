import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DanteOrchestrator } from '../../../orchestrator';
import { createConversation, saveMessage } from '../../../lib/database';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema)
});

export async function POST(request: NextRequest) {
  // --- Auth: Bearer token (RFC 6750) ---
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.DANTE_CORE_TOKEN;

  if (!expectedToken) {
    console.error('[Auth] DANTE_CORE_TOKEN not configured on server');
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Auth not configured' },
      { status: 503 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Token inválido o ausente' },
      { status: 401 }
    );
  }
  // --- End Auth ---

  try {
    const body = await request.json();
    const result = ChatRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Extract query for orchestrator
    const messages = result.data.messages;
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage ? lastUserMessage.content : "";

    // Build GeneralContext from HTTP headers (no dummy financials)
    const generalContext = {
      timezone: request.headers.get('x-user-timezone') || 'UTC',
      locale: request.headers.get('x-user-locale') || 'es-CL',
      userId: request.headers.get('x-user-id') || undefined,
    };
    
    const externalConversationId = request.headers.get('x-conversation-id') || `local-${Date.now()}`;
    const requestId = `req-${Date.now()}`;

    // Initialize Dante Orchestrator
    const orchestrator = new DanteOrchestrator();

    const orchestratorResult = await orchestrator.process({
      query,
      financialContext: generalContext,
      // Pass the previous context so the orchestrator has memory
      chatHistory: messages.slice(0, -1)
    });

    let assistantContent = `[Dante-AI-Core] Status: ${orchestratorResult.status} | Acción: ${orchestratorResult.action}\n`;
    assistantContent += `Payload Result: ${JSON.stringify(orchestratorResult.payload)}`;

    const coreResponse = {
      id: requestId,
      object: 'chat.completion',
      created: Date.now(),
      model: 'dante-ai-core-local',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: assistantContent
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      conversationId: externalConversationId
    };

    if (process.env.USE_DATABASE === 'true') {
      try {
        const convRows = await createConversation(externalConversationId);
        const internalId = convRows[0].id; // UUID

        if (lastUserMessage) {
          await saveMessage(internalId, 'user', lastUserMessage.content, requestId);
        }
        await saveMessage(internalId, 'assistant', coreResponse.choices[0].message.content, requestId);
      } catch (error) {
        // Loggear error, no bloquear respuesta
        console.error('Persistencia falló:', error);
      }
    }

    return NextResponse.json(coreResponse, { status: 200 });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
