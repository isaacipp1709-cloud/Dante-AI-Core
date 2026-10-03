import { FinancialContext } from '../orchestrator';
import { GeneralContext } from './general-context';

export type DanteContext = FinancialContext | GeneralContext;

export function isFinancialContext(ctx: DanteContext): ctx is FinancialContext {
  return 'cajaDisponibleCLP' in ctx;
}

export function isGeneralContext(ctx: DanteContext): ctx is GeneralContext {
  return 'timezone' in ctx && !('cajaDisponibleCLP' in ctx);
}
