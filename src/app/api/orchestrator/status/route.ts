import { NextResponse } from 'next/server';

export async function GET() {
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
