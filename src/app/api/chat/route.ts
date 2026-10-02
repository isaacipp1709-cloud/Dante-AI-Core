// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createConversation, saveMessage } from '../../lib/database';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ChatRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Crear conversación
    const conversation = await createConversation('Chat ' + new Date().toISOString());
    
    // Guardar mensajes del usuario
    for (const msg of result.data.messages) {
      await saveMessage(conversation.id, msg.role, msg.content);
    }

    // Mock provider - respuesta simulada (por ahora, hasta integrar el orchestrator real)
    const mockResponse = {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-dante-provider',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Esta es una respuesta simulada de Dante-AI-Core. Operando en modo offline y $0 cost. Próximamente: conexión con orchestrator real.'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 25,
        total_tokens: 35
      },
      conversationId: conversation.id
    };

    // Guardar respuesta de Dante
    await saveMessage(conversation.id, 'assistant', mockResponse.choices[0].message.content);

    return NextResponse.json(mockResponse, { status: 200 });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
