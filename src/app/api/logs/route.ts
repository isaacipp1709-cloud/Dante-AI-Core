import { requireCoreToken } from '../../../lib/core-auth';
import { NextResponse, NextRequest } from 'next/server';
import { providerRouter } from '../../../orchestrator/provider-router';

export async function GET(request: NextRequest) {
  const auth = requireCoreToken(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const rotations = providerRouter.getRotationHistory();
  
  const logs = [
    { id: '1', timestamp: new Date().toISOString(), level: 'info', module: 'orquestador', message: 'Sistema iniciado correctamente.' },
  ];

  if (process.env.USE_DATABASE === 'true' && process.env.DATABASE_URL) {
    logs.push({
      id: '2',
      timestamp: new Date().toISOString(),
      level: 'info',
      module: 'memoria',
      message: 'Persistencia NeonDB configurada (USE_DATABASE=true).'
    });
  } else {
    logs.push({
      id: '2',
      timestamp: new Date().toISOString(),
      level: 'warn',
      module: 'memoria',
      message: 'Persistencia NeonDB no habilitada o sin DATABASE_URL.'
    });
  }
  
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
