import { NextResponse } from 'next/server';
import { mapCredentialError, resolveByokContext } from '../../../../lib/byok-context';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ credentialId: string }> },
) {
  const resolved = resolveByokContext(request);
  if (!resolved.ok) return NextResponse.json(resolved.body, { status: resolved.status });

  const { credentialId } = await context.params;
  if (typeof credentialId !== 'string' || credentialId.trim().length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'credentialId es requerido.' } },
      { status: 400 },
    );
  }

  try {
    await resolved.context.service.deleteForOwner(credentialId, resolved.context.ownerId);
    return NextResponse.json({ deleted: true, credentialId }, { status: 200 });
  } catch (error) {
    const mapped = mapCredentialError(error);
    return NextResponse.json(
      { error: { code: mapped.code, message: mapped.message } },
      { status: mapped.status },
    );
  }
}
