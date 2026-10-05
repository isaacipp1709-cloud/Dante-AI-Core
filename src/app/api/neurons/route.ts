import { NextResponse } from 'next/server';

export async function GET() {
  const neurons = [
    { id: 'n-001', name: 'Orquestador Principal', status: 'activo', category: 'core', description: 'Enruta, evalúa y controla el flujo cognitivo.', lastExecution: new Date().toISOString() },
    { id: 'n-002', name: 'Memoria y Contexto', status: 'activo', category: 'memory', description: 'Maneja el estado persistente y ventana contextual.', lastExecution: new Date().toISOString() },
    { id: 'n-003', name: 'Aduana Atenea (Guardrails)', status: 'activo', category: 'security', description: 'Filtra prompts maliciosos o respuestas inseguras.', lastExecution: new Date().toISOString() },
    { id: 'n-004', name: 'Router de Providers', status: 'activo', category: 'llm', description: 'Selección inteligente de IA y rotación por fallos.', lastExecution: new Date().toISOString() },
    { id: 'n-005', name: 'Cálculo Financiero', status: 'activo', category: 'tool', description: 'Validación determinista de cálculos (IVA, Pascal).', lastExecution: new Date().toISOString() },
  ];
  
  return NextResponse.json(neurons);
}
