import { DanteOrchestrator, type OrchestratorOutput } from '../../orchestrator';
import { isProviderExecutionBlocked } from '../connections/provider-availability';
import { defaultByokExecutor, resolveGeminiModel, type ByokExecutor } from './byok-executor';
import { resolveArchetype } from '../archetypes/archetype-catalog';

/**
 * Turno de chat con credencial de la boveda, dentro del recorrido de Dante.
 *
 * Orden estricto por solicitud:
 *  1. interruptor (bloquea antes de cualquier llamada al proveedor)
 *  2. DanteOrchestrator: validacion, guardrails y contexto financiero
 *  3. Inyección contextual de arquetipo cognitivo (Dante, Devin, v0, Manus)
 *  4. UNA sola ejecucion del proveedor con la clave resuelta
 *
 * Nunca cae a claves de entorno, mocks ni otro proveedor. La clave solo se
 * entrega al ejecutor: no entra en el prompt, el historial ni la respuesta.
 */

export type ByokTurnStatus = 'ok' | 'blocked' | 'guardrail' | 'provider_error';

export interface ByokTurnInput {
  providerId: string;
  apiKey: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  archetypeId?: string;
  financialContext: Record<string, unknown>;
  /** Proveedores desactivados en el panel (fuente persistente). */
  disabledProviders: readonly string[];
  /** Estado del runtime del enrutador. */
  routerEnabled: boolean;
  /** Inyectable en pruebas; por defecto el ejecutor real de Gemini. */
  executor?: ByokExecutor;
  orchestrator?: Pick<DanteOrchestrator, 'process'>;
}

export interface ByokTurnSuccess {
  status: 'ok';
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  archetypeUsed?: string;
  orchestration: { status: string; action: string };
  /** true solo si el contexto financiero aporto calculos al prompt. */
  enrichedWithFinancialContext: boolean;
}

export interface ByokTurnFailure {
  status: Exclude<ByokTurnStatus, 'ok'>;
  content: string;
  code: string;
  executionInvocations: number;
  orchestration?: { status: string; action: string };
}

export type ByokTurnResult = ByokTurnSuccess | ByokTurnFailure;

function lastUserContent(messages: ByokTurnInput['messages']): string {
  return messages.filter((m) => m.role === 'user').pop()?.content ?? '';
}

export async function runByokChatTurn(input: ByokTurnInput): Promise<ByokTurnResult> {
  // 1. Interruptor ANTES de tocar al proveedor.
  if (isProviderExecutionBlocked({
    providerId: input.providerId,
    disabled: input.disabledProviders,
    routerEnabled: input.routerEnabled,
  })) {
    return {
      status: 'blocked',
      code: 'PROVIDER_DISABLED',
      content: 'El proveedor esta desactivado en el panel de conexiones.',
      executionInvocations: 0,
    };
  }

  // 2. Dante: validacion, guardrails y contexto financiero.
  const orchestrator = input.orchestrator ?? new DanteOrchestrator();
  let orchestration: OrchestratorOutput;
  try {
    orchestration = await orchestrator.process({
      query: lastUserContent(input.messages),
      financialContext: input.financialContext as never,
      chatHistory: input.messages.slice(0, -1),
    });
  } catch {
    return {
      status: 'provider_error',
      code: 'ORCHESTRATOR_ERROR',
      content: 'Dante no pudo procesar la solicitud.',
      executionInvocations: 0,
    };
  }

  if (orchestration.status !== 'SUCCESS') {
    return {
      status: 'guardrail',
      code: 'ORCHESTRATOR_REJECTED',
      content: `[Dante Core Intercept] Acción: ${orchestration.action}.`,
      executionInvocations: 0,
      orchestration: { status: orchestration.status, action: orchestration.action },
    };
  }

  // 3. UNA sola ejecucion, con la clave de la boveda.
  let resolvedModel = input.model;
  if (input.providerId === 'gemini') {
    try {
      resolvedModel = resolveGeminiModel(input.model);
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'INVALID_MODEL';
      return {
        status: 'provider_error',
        code,
        content: 'El modelo solicitado está obsoleto o no está permitido.',
        executionInvocations: 0,
        orchestration: { status: orchestration.status, action: orchestration.action },
      };
    }
  }

  const financialResults = (orchestration.payload?.financialResults ?? {}) as Record<string, unknown>;
  const hasFinancial = Object.keys(financialResults).length > 0;
  const query = lastUserContent(input.messages);

  // Modular el prompt según el arquetipo cognitivo seleccionado
  const archetype = resolveArchetype(input.archetypeId);
  const archetypeHeader = archetype.id !== 'dante' ? `${archetype.systemDirective}\n\n` : '';
  const prompt = `${archetypeHeader}${
    hasFinancial
      ? `${query}\n\n[System Context: Financial calculations: ${JSON.stringify(financialResults)}]`
      : query
  }`;

  let invocations = 0;
  const executor = input.executor ?? defaultByokExecutor;
  const countingExecutor: ByokExecutor = (execInput) => {
    invocations += 1;
    return executor(execInput);
  };

  try {
    const execution = await countingExecutor({
      providerId: input.providerId,
      apiKey: input.apiKey,
      prompt,
      history: input.messages.slice(0, -1),
      model: resolvedModel,
    });
    return {
      status: 'ok',
      content: execution.content,
      model: execution.model,
      usage: execution.usage,
      archetypeUsed: archetype.id,
      orchestration: { status: orchestration.status, action: orchestration.action },
      enrichedWithFinancialContext: hasFinancial,
    };
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'PROVIDER_ERROR';
    return {
      status: 'provider_error',
      code,
      content: 'El proveedor devolvio un error.',
      executionInvocations: invocations,
      orchestration: { status: orchestration.status, action: orchestration.action },
    };
  }
}
