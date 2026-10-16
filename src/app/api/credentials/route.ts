import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mapCredentialError, resolveByokContext } from '../../../lib/byok-context';

export const dynamic = 'force-dynamic';

const CreateCredentialSchema = z.object({
  providerId: z.string().min(1).max(64),
  apiKey: z.string().min(1).max(4096),
});

export async function GET(request: Request) {
  const resolved = resolveByokContext(request);
  if (!resolved.ok) return NextResponse.json(resolved.body, { status: resolved.status });

  try {
    const credentials = await resolved.context.service.listMetadata(resolved.context.ownerId);
    return NextResponse.json(
      { credentials, storage: resolved.context.service.storage },
      { status: 200 },
    );
  } catch (error) {
    const mapped = mapCredentialError(error);
    return NextResponse.json(
      { error: { code: mapped.code, message: mapped.message } },
      { status: mapped.status },
    );
  }
}

export async function POST(request: Request) {
  const resolved = resolveByokContext(request);
  if (!resolved.ok) return NextResponse.json(resolved.body, { status: resolved.status });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Payload JSON invalido.' } },
      { status: 400 },
    );
  }

  const parsed = CreateCredentialSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'providerId y apiKey son requeridos.' } },
      { status: 400 },
    );
  }

  try {
    const metadata = await resolved.context.service.save({
      ownerId: resolved.context.ownerId,
      providerId: parsed.data.providerId,
      apiKey: parsed.data.apiKey,
    });
    return NextResponse.json(
      { saved: true, storage: resolved.context.service.storage, credential: metadata },
      { status: 201 },
    );
  } catch (error) {
    const mapped = mapCredentialError(error);
    return NextResponse.json(
      { error: { code: mapped.code, message: mapped.message } },
      { status: mapped.status },
    );
  }
}
