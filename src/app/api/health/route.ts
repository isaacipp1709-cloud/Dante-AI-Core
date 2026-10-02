// src/app/api/health/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    note: 'Dante-AI-Core backend cognitivo - Sistema nervioso listo'
  });
}
