import { NextResponse, NextRequest } from 'next/server';
import { providerRouter } from '../../../orchestrator/provider-router';

// In a real production setup, logs would be fetched from Neon or CloudWatch.
// For now, we simulate recent logs, extracting rotation history as real logs.
export async function GET(request: NextRequest) {
  const rotations = providerRouter.getRotationHistory();
  
  const logs = [
    { id: '1', timestamp: new Date().toISOString(), level: 'info', module: 'orquestador', message: 'Sistema iniciado correctamente.' },
    { id: '2', timestamp: new Date().toISOString(), level: 'info', module: 'memoria', message: 'Conexión a NeonDB establecida.' },
  ];
  
  rotations.forEach((r, idx) => {
    logs.push({
      id: `rot-${idx}`,
      timestamp: r.timestamp,
      level: 'warn',
      module: 'provider-router',
      message: `Rotación automática: de ${r.originalProvider} a ${r.newProvider} (Motivo: ${r.reason})`
    });
  });

  return NextResponse.json({
    logs: logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  });
}
