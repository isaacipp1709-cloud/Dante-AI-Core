# Diseño de Runtime de Fase 1: Transición de Documental a Verificable

## 1. Objetivo de Fase 1
Establecer un entorno de ejecución (runtime) base y verificable que garantice el cumplimiento del protocolo APP-Ω (0,000% error) sin comprometer el ecosistema original, sentando las bases matemáticas y estructurales necesarias antes de incorporar modelos de lenguaje reales.

## 2. Alcance incluido
- Inicialización del proyecto Node.js y gestión de dependencias (vía `package.json`).
- Migración paralela del orquestador a un entorno tipado y seguro.
- Implementación de un motor matemático de precisión estricta para divisas (CLP/UF).
- Configuración de un framework de testing automatizado (Jest).
- Carga dinámica (lectura de disco) de los archivos Markdown sin depender de un motor RAG complejo.

## 3. Alcance excluido
- Integración real con la API de Google Gemini (LLM).
- Bases de datos de cualquier tipo (Mongo, vectoriales).
- Despliegue de LibreChat o Dockerización.
- Desarrollo de un servidor HTTP/API web público.

## 4. Arquitectura mínima propuesta
Un paquete Node.js de línea de comandos y lógica de negocio encapsulada. Contará con una capa de lectura de archivos locales, una capa de validación de entrada/salida (Schemas), una capa de orquestación de negocio (reemplazo del orquestador actual) y una batería de pruebas unitarias exhaustivas.

## 5. Árbol de archivos final esperado
```text
DANTE_ECOSISTEMA/
├── src/
│   ├── orchestrator.ts
│   ├── math/
│   │   └── financial.ts
│   └── loaders/
│       └── markdownLoader.ts
├── tests/
│   └── orchestrator.test.ts
├── package.json
├── tsconfig.json
└── [archivos documentales originales intactos]
```

## 6. Dependencias propuestas y por qué son necesarias
- `typescript`: Para validación de tipos estáticos, vital en lógica de negocio estricta.
- `jest` y `ts-jest`: Para la batería de pruebas y asegurar el 0,000% de tolerancia al error.
- `decimal.js`: Para manejar la UF con precisión fraccionaria exacta sin problemas de punto flotante de JavaScript.
- `zod`: (Opcional pero recomendado) para garantizar el contrato de entrada y salida mediante schemas estrictos en tiempo de ejecución.

## 7. Contrato de entrada del orquestador
El orquestador recibirá un objeto de datos estructurado que incluirá el `query` crudo del usuario, el ID de la neurona objetivo preseleccionada (opcional), y variables de contexto numérico (ej. saldo caja, ventas netas, valor UF del día) pasadas como propiedades explícitas, en lugar de intentar extraerlas mediante LLM todavía.

## 8. Contrato de salida del orquestador
Retornará un objeto tipado que especifique:
- `status`: Éxito, rechazo de guardrail, o rechazo matemático.
- `action`: Siguiente paso sugerido.
- `payload`: Resultados numéricos exactos, estado de semáforos y mensajes de auditoría limpios.
- `auditTrail`: Traza de ejecución y fuentes utilizadas.

## 9. Manejo de errores
- Implementación de clases de error personalizadas (`MathPrecisionError`, `GuardrailViolationError`, `NormativeError`).
- Todo error será capturado (try/catch a nivel superior) y formateado como un objeto JSON estructurado. No se utilizará `throw Error` crudo que exponga o quiebre el proceso de ejecución general.

## 10. Contrato de selección de neuronas
Se implementará un catálogo/mapa (diccionario) estático en código que vinculará un identificador (ej. `N01_CONTABILIDAD`) con la ruta de su archivo Markdown respectivo. El orquestador requerirá este ID en el contrato de entrada para saber qué instrucciones cargar, omitiendo todavía algoritmos de ruteo basados en IA.

## 11. Cómo leer e inyectar los archivos Markdown sin afirmar que existe RAG
Se construirá un "Loader" de sistema de archivos (usando `fs/promises` de Node.js) que buscará el archivo correspondiente al ID de la neurona en las carpetas `/brain/` o `/neurons/`, lo cargará a memoria como un string completo de texto y lo inyectará directamente en el payload como `contextString`, sin realizar división en chunks ni vectorización algorítmica.

## 12. Estrategia de cálculos financieros
- **CLP como enteros:** Se obligará mediante tipado y validación que todos los cálculos en pesos chilenos manejen estrictamente `BigInt` o números enteros nativos.
- **UF como decimal exacto:** Se empleará `decimal.js` obligatoriamente para toda operación que involucre UF, garantizando precisión de 2 a 4 decimales.
- **IVA no hardcodeado:** Se extraerán los porcentajes tributarios a un objeto de constantes normativas configurable, exigiendo que se provea como parámetro explícito (`taxRate: 0.19`) en la función o inyectado desde un archivo de reglas fiscales versión-controlable.
- **Cuándo usar decimal.js:** En *todas* las operaciones que incluyan tasas, divisiones, conversiones de moneda o cálculo de porcentajes antes del redondeo legal final.

## 13. Estrategia de pruebas
- **Pruebas antes de refactorizar:** Redactar un baseline de test basado en la respuesta esperada del archivo JS antiguo.
- **Casos normales:** Cálculos estándar (IVA, caja de 15 días) con valores redondos y predecibles.
- **Casos límite:** Saldo en cero, caja negativa, valores astronómicos, operaciones que retornen fracción .5 de pesos chilenos.
- **Casos de error:** Envíos de strings en vez de números, división por cero, o fallos de `preFlightCheck` (vacas vuelan).
- **Casos de normativa chilena:** Simular cambios normativos (ej. evaluar IVA al 20%, evaluar retenciones de honorarios cambiantes) para asegurar flexibilidad.

## 14. Estrategia de migración gradual
- Conservar el archivo `dante_runtime_orchestrator.js` intacto.
- Crear una nueva estructura en `src/` escrita nativamente en TypeScript (`orchestrator.ts`).
- Crear pruebas que primero invoquen al `dante_runtime_orchestrator.js` y luego a `orchestrator.ts`.
- Una vez que `orchestrator.ts` apruebe todos los casos de prueba y supere en precisión al archivo antiguo, el equipo decidirá el reemplazo, aunque se mantendrá el `.js` como histórico hasta la Fase 2.

## 15. Lista exacta de archivos que se crearán o modificarán en la siguiente sesión
- Creación de: `package.json`
- Creación de: `tsconfig.json`
- Creación de: `src/orchestrator.ts`
- Creación de: `src/math/financial.ts`
- Creación de: `src/loaders/markdownLoader.ts`
- Creación de: `tests/orchestrator.test.ts`
- Creación de: `jest.config.js`

## 16. Criterios de aceptación de Fase 1
- `npm run test` se ejecuta correctamente y todos los tests pasan en verde (cobertura +85%).
- Los cálculos financieros de UF vs CLP pasan tests de estrés de precisión de decimales usando `decimal.js`.
- Es posible invocar al orquestador en un script básico de Node apuntando a un archivo Markdown local sin arrojar excepciones síncronas no controladas.
- Los archivos originales del repositorio documentado no fueron alterados en absoluto.

## 17. Riesgos y rollback
- **Riesgo:** Complicación prematura del tipado.
- **Rollback:** Al no tocar el archivo original y ejecutar todo localmente, se puede eliminar la carpeta `src/`, `tests/` y `node_modules` en un comando sin afectar el repositorio documental.

---

## Decisión requerida del Arquitecto

Con estas tres opciones:

A. Runtime mínimo JavaScript primero, TypeScript después.
B. TypeScript desde el inicio, conservando el JavaScript como referencia.
C. No construir runtime todavía y avanzar primero con documentación/LibreChat.
