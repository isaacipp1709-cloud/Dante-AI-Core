/**
 * Verificacion del token Bearer del bridge (DANTE_CORE_TOKEN).
 * Sin token configurado en el servidor se responde CONFIGURATION_ERROR:
 * nunca se emite un estado inventado ni se exponen detalles de configuracion.
 */

export interface CoreAuthOk { ok: true }

export interface CoreAuthFailure {
  ok: false;
  status: number;
  body: { error: { code: string; message: string } };
}

export function requireCoreToken(
  request: { headers: { get(name: string): string | null } },
  env: Record<string, string | undefined> = process.env,
): CoreAuthOk | CoreAuthFailure {
  const expected = env.DANTE_CORE_TOKEN;
  if (typeof expected !== 'string' || expected.length === 0) {
    return {
      ok: false,
      status: 500,
      body: { error: { code: 'CONFIGURATION_ERROR', message: 'El token del bridge no esta configurado.' } },
    };
  }

  const header = request.headers.get('authorization');
  if (header !== `Bearer ${expected}`) {
    return {
      ok: false,
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'Autenticacion requerida.' } },
    };
  }

  return { ok: true };
}
