# Plan de Ejecución de Fase 1: Runtime TypeScript (Opción B)

## 1. Árbol final de archivos
```text
Dante-AI-Core/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── orchestrator.ts
│   ├── config/
│   │   └── taxes.ts
│   ├── math/
│   │   └── financial.ts
│   ├── loaders/
│   │   └── markdownLoader.ts
│   └── errors/
│       └── DanteErrors.ts
├── tests/
│   ├── orchestrator.test.ts
│   ├── math/
│   │   └── financial.test.ts
│   └── loaders/
│       └── markdownLoader.test.ts
└── [Archivos originales intactos: dante_runtime_orchestrator.js, README, neurons/, etc.]
```

*Nota:* El diseño no debe depender de rutas absolutas de Windows. Las rutas deben resolverse desde `process.cwd()` o una raíz de proyecto inyectable para tests.

## 2. Contenido y propósito de cada archivo
- `src/orchestrator.ts`: Nueva clase principal del orquestador, tipada, que coordina la carga de documentos y ejecución de reglas de negocio.
- `src/config/taxes.ts`: Archivo versionado que almacena tasas impositivas y reglas regulatorias.
- `src/math/financial.ts`: Biblioteca centralizada para todo cálculo, garantizando integridad matemática.
- `src/loaders/markdownLoader.ts`: Utilidad para leer archivos `.md` desde el disco mediante sistema de archivos nativo de Node.
- `src/errors/DanteErrors.ts`: Definición de clases de error personalizadas.
- `tests/*`: Batería de pruebas automatizadas para garantizar precisión.

## 3. package.json propuesto
```json
{
  "name": "dante-ai-core",
  "version": "1.0.0",
  "description": "DANTE v4.0 Runtime Ecosystem",
  "main": "dist/orchestrator.js",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "decimal.js": "^10.4.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.20",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.3.3"
  }
}
```

## 4. tsconfig.json propuesto
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "tests"]
}
```

## 5. Configuración de Jest propuesta (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
```

## 6. Dependencias exactas y versiones recomendadas
- **Producción:** `decimal.js` (cálculos UF exactos), `zod` (validación de contratos).
- **Desarrollo:** `typescript`, `jest`, `ts-jest`, y dependencias `@types/*` para Node y Jest.

## 7. Scripts npm exactos
- `npm run build`: Transpila TypeScript a JavaScript (carpeta `dist/`).
- `npm run test`: Ejecuta la suite de pruebas unitarias.
- `npm run test:coverage`: Ejecuta pruebas y asegura las métricas estipuladas.

## 8. Interfaces TypeScript necesarias
```typescript
interface FinancialContext {
  cajaDisponibleCLP: bigint | number;
  sueldosLiquidosMensualesCLP: bigint | number;
  ventasNetasCLP?: bigint | number;
  comprasNetasCLP?: bigint | number;
  remanenteAnteriorCLP?: bigint | number;
  valorUF?: string; // Representado como string para Decimal.js
}

interface OrchestratorInput {
  query: string;
  targetNeuronId?: string;
  financialContext: FinancialContext;
  taxConfigOverride?: Partial<TaxConfig>;
}

interface OrchestratorOutput {
  status: 'SUCCESS' | 'GUARDRAIL_REJECTED' | 'MATH_ERROR' | 'SYSTEM_ERROR';
  action: string;
  payload: any;
  contextString?: string;
}

interface TaxConfig {
  ivaRate: string; // Ej: "0.19"
  // Otras tasas regulatorias
}
```

## 9. Contrato de entrada del nuevo orquestador
El orquestador recibe un objeto estructurado (`OrchestratorInput`) que debe contener obligatoriamente el contexto financiero, evitando inferir datos críticos a partir de lenguaje natural y garantizando la inyección de tasas impositivas.

## 10. Contrato de salida
Un objeto inmutable (`OrchestratorOutput`) que retorna respuestas deterministas y empaqueta el contenido de los Markdown encontrados como un simple string en `contextString`.

## 11. Catálogo de errores tipados
- `MathPrecisionError`: Problemas de precisión fraccional.
- `GuardrailViolationError`: Activación de filtros éticos/alucinaciones.
- `ConfigurationError`: Ausencia de configuraciones de tasas o contexto obligatorio.
- `DocumentNotFoundError`: Archivo Markdown objetivo inexistente.

## 12. Estrategia de lectura de Markdown
- **Rutas soportadas:** `brain/`, `consciousness/`, `instructions/`, `neurons/`, `audit/`.
- Uso exclusivo de `fs.promises.readFile` leyendo codificación `utf-8`.

## 13. Regla de que Markdown es contexto documental, no RAG
Cero procesamiento vectorial. El contenido se lee de principio a fin, manteniéndolo como una cadena de texto gigante (`string`). No se instalan herramientas de embeddings, chunking ni motores vectoriales.

## 14. Estrategia CLP, UF, porcentajes e IVA
- **CLP (Pesos):** Manejados estrictamente como números enteros.
- **UF y Porcentajes:** Se instanciarán siempre como objetos `new Decimal(valor)`. Toda multiplicación de CLP por tasas compuestas se ejecutará sobre el motor `decimal.js` y el resultado final se parseará de vuelta a entero para CLP.
- **IVA:** Estrictamente importado desde `src/config/taxes.ts`. Prohibido el uso de `0.19` quemado (hardcoded) en las funciones matemáticas.
- **Precisión:** Validada por la suite de pruebas unitarias, buscando resultados deterministas, reproducibles y validados contra reglas de redondeo explícitas, contratos tipados y casos de prueba definidos.

## 15. Casos de prueba exactos
1. Cálculo de IVA Normal: Ventas 1.000.000 CLP, Compras 500.000 CLP, remanente 0.
2. Cálculo de IVA con remanente superior al débito.
3. Cálculos en UF: Conversión a CLP asegurando no pérdida de centavos.
4. Semáforo de Pascal (Caja).
5. Casos de error real de Fase 1:
   - input inválido contra schema Zod;
   - monto CLP no entero;
   - UF inválida;
   - tasa tributaria fuera de rango;
   - archivo Markdown inexistente;
   - ruta Markdown fuera de directorios permitidos;
   - configuración tributaria ausente;
   - error tipado del orquestador;
   - resultado de salida que no cumple el contrato.

## 16. Orden preciso de implementación
1. Inicialización NPM (`package.json`).
2. Configuración estructural (`tsconfig.json`, `jest.config.js`).
3. Dominio Financiero (`taxes.ts`, `financial.ts` y sus tests).
4. Infraestructura de Carga (`markdownLoader.ts` y sus tests).
5. Orquestador y Contratos (`orchestrator.ts` y sus tests).
6. Auditoría final de resultados contra `dante_runtime_orchestrator.js`.

## 17. Criterios de aceptación
- `npm run test:coverage` reporta sobre 90% de cobertura.
- `dante_runtime_orchestrator.js` y todo archivo original sigue presente e intacto.
- Ninguna función del orquestador realiza operaciones matemáticas puras (todo delegado a `src/math`).
- Todas las divisas y tasas siguen las reglas estrictas.

## 18. Plan de rollback
Al no tocar los archivos originales, el rollback consiste simplemente en eliminar la carpeta `src/`, `tests/`, `node_modules` y los archivos de configuración `.json`.

## 19. Lista de archivos que se crearán
`package.json`, `tsconfig.json`, `jest.config.js`, `src/orchestrator.ts`, `src/config/taxes.ts`, `src/math/financial.ts`, `src/loaders/markdownLoader.ts`, `src/errors/DanteErrors.ts`, `tests/orchestrator.test.ts`, `tests/math/financial.test.ts`, `tests/loaders/markdownLoader.test.ts`.

## 20. Lista de archivos que nunca se modificarán
`dante_runtime_orchestrator.js`, `README.md`, `system_prompt_dante.md`, `librechat.yaml`, `.env.example`, y los archivos dentro de `brain/`, `consciousness/`, `instructions/`, `neurons/`, `audit/`.

## Límites de Fase 1
- Fase 1 no implementa RAG.
- Fase 1 no implementa llamada a LLM.
- Fase 1 no implementa autenticación.
- Fase 1 no implementa LibreChat.
- Fase 1 no implementa dashboard.
- Fase 1 no implementa Telegram, WhatsApp, Obsidian ni Finance Nexus.
- Fase 1 no afirma seguridad completa contra prompt injection.
- Los archivos Markdown se cargan como contexto local controlado, no como recuperación semántica.
- Toda acción externa queda fuera del alcance.
- El nuevo runtime no ejecuta herramientas externas.

## Convenciones Financieras
- CLP: bigint o number entero seguro con límite documentado.
- UF: Decimal como string de entrada y Decimal interno.
- Porcentajes: Decimal expresado como fracción; por ejemplo 0.19 para 19%.
- Redondeo: definir una única política, por defecto ROUND_HALF_UP, y probarla.
- Tasas tributarias: configuración tipada, versionada y fechada.
- Ninguna tasa regulatoria se asume vigente sin fuente, fecha de vigencia y revisión humana.
- El runtime entrega cálculos técnicos, no asesoría tributaria, financiera ni legal.

## Puerta de Implementación
La implementación de Fase 1 solo podrá empezar cuando se cumpla todo esto:
- Git disponible o mecanismo confirmado para versionar y subir cambios a GitHub.
- Repositorio y remote origin verificados.
- Plan corregido revisado por el Arquitecto.
- `.gitignore` revisado antes de agregar `.env`.
- Dependencias bloqueadas por versión.
- Tests definidos antes de refactorizar.
- Ningún secreto incluido en código, historial o documentación.
