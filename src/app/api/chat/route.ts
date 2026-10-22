import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DanteOrchestrator } from '../../../orchestrator';
import { createConversation, query as runSqlQuery, sanitizeDatabaseError, saveMessage } from '../../../lib/database';
import { mapCredentialError, resolveByokContext } from '../../../lib/byok-context';
import { OWNER_ASSERTION_HEADER, verifyOwnerAssertion } from '../../../lib/owner-assertion';
import { runByokChatTurn } from '../../../orchestrator/credentials/byok-turn';
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
  archetypeId: z.string().min(1).max(64).optional(),
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

    // Identidad del usuario final: SOLO desde la asercion firmada por La Casa.
    const ownerAssertion = verifyOwnerAssertion({
      assertion: request.headers.get(OWNER_ASSERTION_HEADER),
      secret: process.env.DANTE_CORE_TOKEN,
    });
    if (!ownerAssertion.ok) {
      return NextResponse.json(
        { error: { code: ownerAssertion.code, message: ownerAssertion.message } },
        { status: ownerAssertion.status },
      );
    }
    const verifiedOwnerId = ownerAssertion.ownerId;

    let targetCredentialId = result.data.credentialId;
    if (!targetCredentialId) {
      try {
        const autoByok = resolveByokContext(request);
        if (autoByok.ok) {
          const credentials = await autoByok.context.service.listMetadata(autoByok.context.ownerId);
          if (credentials.length > 0) {
            const matched = result.data.providerId
              ? credentials.find((c) => c.providerId === result.data.providerId)
              : credentials[0];
            targetCredentialId = matched ? matched.credentialId : credentials[0].credentialId;
          }
        }
      } catch {
        // Fallback cerrado a requerir credencial explícita
      }
    }

    if (!targetCredentialId) {
      return NextResponse.json(
        {
          error: {
            code: 'CREDENTIAL_REQUIRED',
            message: 'Selecciona una conexion guardada para conversar con Dante.',
          },
        },
        { status: 400 },
      );
    }

    const byokContext = resolveByokContext(request);
    if (!byokContext.ok) {
      return NextResponse.json(byokContext.body, { status: byokContext.status });
    }

    // Extract query for orchestrator
    const messages = result.data.messages;
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const query = lastUserMessage ? lastUserMessage.content : "";

    // Build GeneralContext from HTTP headers (no dummy financials)
    const generalContext = {
      timezone: request.headers.get('x-user-timezone') || 'UTC',
      locale: request.headers.get('x-user-locale') || 'es-CL',
      userId: verifiedOwnerId,
    };
    
    const externalConversationId = request.headers.get('x-conversation-id') || `local-${Date.now()}`;
    const requestId = `req-${Date.now()}`;

    // --- BYOK: credencial del propietario autenticado ---
    let credential: { providerId: string; apiKey: string };
    try {
      credential = await byokContext.context.service.resolveForOwner(
        targetCredentialId,
        byokContext.context.ownerId,
      );
    } catch (error) {
      const mapped = mapCredentialError(error);
      return NextResponse.json(
        { error: { code: mapped.code, message: mapped.message } },
        { status: mapped.status },
      );
    }

    // Interruptor (fuente persistente + runtime) antes de cualquier llamada.
    let disabledProviders: string[] = [];
    let routerEnabled = true;
    try {
      const { getProviderSettingsStore } = await import(
        '../../../orchestrator/connections/provider-settings-store'
      );
      const settings = getProviderSettingsStore({
        env: process.env,
        runSql: (text: string, params?: unknown[]) => runSqlQuery(text, params as unknown[] | undefined),
      });
      disabledProviders = await settings.listDisabled();
      const { providerRouter } = await import('../../../orchestrator/provider-router');
      routerEnabled = providerRouter.isProviderEnabled(credential.providerId);
    } catch {
      return NextResponse.json(
        { error: { code: 'STORAGE_ERROR', message: 'No fue posible verificar el estado del proveedor.' } },
        { status: 503 },
      );
    }

    // Propiedad de la conversacion ANTES de tocar al proveedor.
    if (process.env.USE_DATABASE === 'true') {
      try {
        const { assertConversationAccess, ConversationOwnershipError } = await import(
          '../../../lib/conversations-repository'
        );
        await assertConversationAccess(
          (text: string, params?: unknown[]) => runSqlQuery(text, params as unknown[] | undefined),
          externalConversationId,
          byokContext.context.ownerId,
        );
      } catch (error) {
        const { ConversationOwnershipError } = await import('../../../lib/conversations-repository');
        if (error instanceof ConversationOwnershipError) {
          // Conversacion ajena o historica: se rechaza SIN consumir proveedor.
          return NextResponse.json(
            { error: { code: 'CONVERSATION_NOT_ACCESSIBLE', message: 'Esa conversacion no te pertenece.' } },
            { status: 403 },
          );
        }
        return NextResponse.json(
          { error: { code: 'STORAGE_ERROR', message: 'No fue posible verificar la conversacion.' } },
          { status: 503 },
        );
      }
    }

    const headerArchetype = request.headers.get('x-dante-archetype') || undefined;
    const effectiveArchetype = result.data.archetypeId || headerArchetype || 'dante';

    // Dante (validacion, guardrails, contexto, arquetipo) + UNA ejecucion con la boveda.
    const turn = await runByokChatTurn({
      providerId: credential.providerId,
      apiKey: credential.apiKey,
      messages,
      model: result.data.model,
      archetypeId: effectiveArchetype,
      financialContext: generalContext as unknown as Record<string, unknown>,
      disabledProviders,
      routerEnabled,
    });

    if (turn.status === 'blocked') {
      return NextResponse.json(
        { error: { code: 'PROVIDER_DISABLED', message: turn.content } },
        { status: 403 },
      );
    }

    if (turn.status === 'guardrail') {
      // Dante intercepta la solicitud: no se llama al proveedor.
      return NextResponse.json(
        {
          id: requestId,
          object: 'chat.completion',
          created: Date.now(),
          model: 'core-system',
          choices: [
            { index: 0, message: { role: 'assistant', content: turn.content }, finish_reason: 'stop' },
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          orchestration: turn.orchestration,
          persistence: 'disabled',
          conversationId: externalConversationId,
        },
        { status: 200 },
      );
    }

    if (turn.status === 'provider_error') {
      const status =
        turn.code === 'INVALID_MODEL' ? 400
        : turn.code === 'AUTH_ERROR' ? 401
        : turn.code === 'QUOTA_EXCEEDED' ? 429
        : turn.code === 'TIMEOUT' ? 504
        : 502;
      const code =
        turn.code === 'INVALID_MODEL' ? 'INVALID_MODEL'
        : turn.code === 'AUTH_ERROR' ? 'PROVIDER_UNAUTHORIZED'
        : turn.code === 'QUOTA_EXCEEDED' ? 'PROVIDER_RATE_LIMITED'
        : turn.code === 'TIMEOUT' ? 'PROVIDER_TIMEOUT'
        : 'PROVIDER_ERROR';
      return NextResponse.json({ error: { code, message: turn.content } }, { status });
    }

    if (turn.status !== 'ok') {
      return NextResponse.json(
        { error: { code: 'PROVIDER_ERROR', message: turn.content } },
        { status: 502 },
      );
    }

    const lastUserContent = messages.filter((m) => m.role === 'user').pop()?.content ?? '';

    // Persistencia acotada al propietario verificado (nunca global).
    let persistence: 'saved' | 'unavailable' | 'disabled' = 'disabled';
    if (process.env.USE_DATABASE === 'true') {
      try {
        const { appendMessageForOwner } = await import('../../../lib/conversations-repository');
        const run = (text: string, params?: unknown[]) => runSqlQuery(text, params as unknown[] | undefined);
        await appendMessageForOwner(run, externalConversationId, byokContext.context.ownerId, 'user', lastUserContent, requestId);
        await appendMessageForOwner(run, externalConversationId, byokContext.context.ownerId, 'assistant', turn.content, requestId);
        persistence = 'saved';
      } catch {
        persistence = 'unavailable';
      }
    }

    return NextResponse.json(
      {
        id: requestId,
        object: 'chat.completion',
        created: Date.now(),
        model: turn.model,
        archetype: (turn as { archetypeUsed?: string }).archetypeUsed || effectiveArchetype,
        choices: [
          { index: 0, message: { role: 'assistant', content: turn.content }, finish_reason: 'stop' },
        ],
        usage: turn.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        requestedProvider: credential.providerId,
        credentialUsed: true,
        orchestration: turn.orchestration,
        persistence,
        conversationId: externalConversationId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Chat error:', sanitizeDatabaseError(error));
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred while processing the chat request',
      },
      { status: 500 }
    );
  }
}
