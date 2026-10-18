import { requireCoreToken } from '../../../../lib/core-auth';
import { NextRequest, NextResponse } from 'next/server';
import { providerRouter } from '../../../../orchestrator/provider-router';

export async function GET(request: NextRequest) {
  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const providers = providerRouter.getProvidersStatus();
  const history = providerRouter.getRotationHistory();
  
  return NextResponse.json({
    status: 'ok',
    providers,
    rotations: history
  });
}
