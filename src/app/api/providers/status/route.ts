import { NextResponse } from 'next/server';
import { providerRouter } from '../../../../orchestrator/provider-router';

export async function GET() {
  const providers = providerRouter.getProvidersStatus();
  const history = providerRouter.getRotationHistory();
  
  return NextResponse.json({
    status: 'ok',
    providers,
    rotations: history
  });
}
