import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DanteOrchestrator } from '../../../orchestrator';
import { createConversation, saveMessage } from '../../../lib/database';
import { mapCredentialError, resolveByokContext } from '../../../lib/byok-context';
import { defaultByokExecutor } from '../../../orchestrator/credentials/byok-executor';
import { ProviderNotSupportedError } from '../../../orchestrator/credentials/credential-service';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  /** BYOK: referencia a la credencial del propietario (nunca la clave). */
  credentialId: z.string().min(1).max(128).optional(),
  providerId: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(120).optional(),
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

    // --- BYOK: credencial del propietario autenticado ---
    if (result.data.credentialId) {
      const byokContext = resolveByokContext(request);
      if (!byokContext.ok) {
        return NextResponse.json(byokContext.body, { status: byokContext.status });
      }

      let credential: { providerId: string; apiKey: string };
      try {
        credential = await byokContext.context.service.resolveForOwner(
          result.data.credentialId,
          byokContext.context.ownerId,
        );
      } catch (error) {
        const mapped = mapCredentialError(error);
        return NextResponse.json(
          { error: { code: mapped.code, message: mapped.message } },
          { status: mapped.status },
        );
      }

      const byokPrompt = messages.filter((m) => m.role === 'user').pop()?.content ?? '';

      try {
        const execution = await defaultByokExecutor({
          providerId: credential.providerId,
          apiKey: credential.apiKey,
          prompt: byokPrompt,
          history: messages.slice(0, -1),
          model: result.data.model,
        });

        return NextResponse.json(
          {
            id: requestId,
            object: 'chat.completion',
            created: Date.now(),
            model: execution.model,
            choices: [{
              index: 0,
              message: { role: 'assistant', content: execution.content },
              finish_reason: 'stop',
            }],
            usage: execution.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            requestedProvider: credential.providerId,
            credentialUsed: true,
            conversationId: externalConversationId,
          },
          { status: 200 },
        );
      } catch (error) {
        if (error instanceof ProviderNotSupportedError) {
          return NextResponse.json(
            { error: { code: 'PROVIDER_NOT_SUPPORTED', message: 'Proveedor no habilitado para BYOK.' } },
            { status: 400 },
          );
        }
        const providerCode = (error as { code?: string }).code;
        if (providerCode === 'AUTH_ERROR') {
          return NextResponse.json(
            { error: { code: 'PROVIDER_UNAUTHORIZED', message: 'El proveedor rechazo la credencial guardada.' } },
            { status: 401 },
          );
        }
        if (providerCode === 'QUOTA_EXCEEDED') {
          return NextResponse.json(
            { error: { code: 'PROVIDER_RATE_LIMITED', message: 'Limite de uso alcanzado en el proveedor.' } },
            { status: 429 },
          );
        }
        if (providerCode === 'TIMEOUT') {
          return NextResponse.json(
            { error: { code: 'PROVIDER_TIMEOUT', message: 'El proveedor no respondio a tiempo.' } },
            { status: 504 },
          );
        }
        return NextResponse.json(
          { error: { code: 'PROVIDER_ERROR', message: 'El proveedor devolvio un error.' } },
          { status: 502 },
        );
      }
    }


    const orchestrator = new DanteOrchestrator();

    const orchestratorResult = await orchestrator.process({
      query,
      financialContext: generalContext,
      chatHistory: messages.slice(0, -1)
    });

    let finalResponseContent = '';
    let finalProviderId = 'core-system';
    let tokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    if (orchestratorResult.status === 'SUCCESS') {
      // 1. Context and guardrails OK. Pass to Provider Router
      const { providerRouter } = await import('../../../orchestrator/provider-router');
      
      // Inject orchestrator context into prompt if needed (e.g. financial results)
      const enrichedPrompt = orchestratorResult.payload.financialResults 
        ? `${query}\n\n[System Context: Financial calculations: ${JSON.stringify(orchestratorResult.payload.financialResults)}]`
        : query;

      const { response, providerId } = await providerRouter.executeWithFallback(enrichedPrompt, messages.slice(0, -1));
      
      finalResponseContent = response.content;
      finalProviderId = providerId;
      if (response.usage) tokenUsage = response.usage;

    } else {
      // 2. Guardrail rejected or Math error. Core intercepts.
      finalResponseContent = `[Dante Core Intercept] Acción: ${orchestratorResult.action}. Detalle: ${JSON.stringify(orchestratorResult.payload)}`;
      finalProviderId = 'core-system';
    }

    const coreResponse = {
      id: requestId,
      object: 'chat.completion',
      created: Date.now(),
      model: finalProviderId,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: finalResponseContent
        },
        finish_reason: 'stop'
      }],
      usage: tokenUsage,
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
