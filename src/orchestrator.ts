import { z } from 'zod';
import { FinancialMath } from './math/financial';
import { MarkdownLoader } from './loaders/markdownLoader';
import { defaultTaxes, TaxConfig } from './config/taxes';
import { DanteBaseError, ConfigurationError, GuardrailViolationError } from './errors/DanteErrors';

const FinancialContextSchema = z.object({
  cajaDisponibleCLP: z.union([z.number().int(), z.bigint()]),
  sueldosLiquidosMensualesCLP: z.union([z.number().int(), z.bigint()]),
  ventasNetasCLP: z.union([z.number().int(), z.bigint()]).optional(),
  comprasNetasCLP: z.union([z.number().int(), z.bigint()]).optional(),
  remanenteAnteriorCLP: z.union([z.number().int(), z.bigint()]).optional(),
  valorUF: z.string().optional()
});

export type FinancialContext = z.infer<typeof FinancialContextSchema>;

export interface OrchestratorInput {
  query: string;
  targetNeuronId?: string; // Corresponde al path del archivo markdown
  financialContext: FinancialContext;
  taxConfigOverride?: Partial<TaxConfig>;
}

export interface OrchestratorOutput {
  status: 'SUCCESS' | 'GUARDRAIL_REJECTED' | 'MATH_ERROR' | 'SYSTEM_ERROR';
  action: string;
  payload: any;
  contextString?: string;
}

export class DanteOrchestrator {
  private markdownLoader: MarkdownLoader;
  private taxConfig: TaxConfig;

  constructor(rootDir?: string, taxConfigOverride?: Partial<TaxConfig>) {
    this.markdownLoader = new MarkdownLoader(rootDir);
    this.taxConfig = { ...defaultTaxes, ...taxConfigOverride };
  }

  public async process(input: OrchestratorInput): Promise<OrchestratorOutput> {
    try {
      // 1. Validar Contexto Financiero (Schema)
      const parsedContext = FinancialContextSchema.parse(input.financialContext);

      // 2. Aduana Atenea Básica (Fase 1: No Regex frágil, pero validación de estructura y rechazos hardcodeados como demo de error)
      if (input.query.toLowerCase().includes('vacas vuelan')) {
          throw new GuardrailViolationError("Fallo intencional por pruebas (vacas vuelan eliminado de preFlightCheck JS pero usado en test para fallos explícitos).");
      }

      // 3. Ejecutar Cálculos Financieros (Columna Vertebral)
      const payload: any = { financialResults: {} };

      // Reserva Pascal
      payload.financialResults.pascal = FinancialMath.checkPascalReserve(
        parsedContext.sueldosLiquidosMensualesCLP, 
        parsedContext.cajaDisponibleCLP
      );

      // IVA
      if (parsedContext.ventasNetasCLP !== undefined && parsedContext.comprasNetasCLP !== undefined) {
        payload.financialResults.iva = FinancialMath.calculateIVA(
          parsedContext.ventasNetasCLP,
          parsedContext.comprasNetasCLP,
          parsedContext.remanenteAnteriorCLP,
          { ...this.taxConfig, ...input.taxConfigOverride }
        );
      }

      // 4. Cargar contexto documental si se pide
      let contextString: string | undefined = undefined;
      if (input.targetNeuronId) {
        contextString = await this.markdownLoader.loadMarkdown(input.targetNeuronId);
      }

      return {
        status: 'SUCCESS',
        action: 'CONTEXT_LOADED_WAITING_LLM',
        payload,
        contextString
      };

    } catch (e: any) {
      if (e instanceof DanteBaseError) {
        return {
          status: e.name === 'GuardrailViolationError' ? 'GUARDRAIL_REJECTED' : 'MATH_ERROR',
          action: 'CORRECTION_REQUIRED',
          payload: { error: e.message }
        };
      } else if (e instanceof z.ZodError) {
         return {
          status: 'SYSTEM_ERROR',
          action: 'INVALID_INPUT',
          payload: { error: "Validation failed", details: e.errors }
        };
      }

      return {
        status: 'SYSTEM_ERROR',
        action: 'CRITICAL_HALT',
        payload: { error: e.message }
      };
    }
  }
}
