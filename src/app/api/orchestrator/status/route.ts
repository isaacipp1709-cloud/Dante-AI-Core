import { requireCoreToken } from '../../../../lib/core-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  return NextResponse.json({
    status: 'operativo',
    version: '1.1.0',
    mode: 'hybrid', // Core + External LLMs
    activeModules: [
      { id: 'financial-math', status: 'activo' },
      { id: 'guardrails', status: 'activo' },
      { id: 'provider-router', status: 'activo' }
    ],
    uptime: process.uptime()
  });
}
