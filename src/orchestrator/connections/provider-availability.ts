/**
 * Decision unica del interruptor: una conexion desactivada bloquea NUEVAS
 * operaciones, incluso con llamadas directas a la API. No cancela operaciones
 * ya iniciadas ni elimina credenciales.
 */
export interface ProviderAvailabilityInput {
  providerId: string;
  /** Proveedores desactivados segun el store persistente del panel. */
  disabled: readonly string[];
  /** Estado en el runtime del enrutador (misma fuente que usa el chat clasico). */
  routerEnabled: boolean;
}

export function isProviderExecutionBlocked(input: ProviderAvailabilityInput): boolean {
  return input.disabled.includes(input.providerId) || !input.routerEnabled;
}
