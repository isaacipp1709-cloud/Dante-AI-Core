# Plan de Implementación Paso a Paso (Implementation Plan)

Este plan ordena las acciones necesarias para convertir el repositorio Dante en un software funcional.

### Fase 1: Fundamentos de Código (Setup Node.js)
1. **Inicializar Proyecto:** Ejecutar `npm init -y` para crear el `package.json`.
2. **Migración a TypeScript:** Instalar TypeScript y tipos base para dar seguridad y tipado estricto a las operaciones de la *Columna Vertebral de Gauss*.
3. **Manejo de Precisión Matemática:** Integrar una librería de alta precisión (ej. `decimal.js`) en `dante_runtime_orchestrator.js` para reemplazar las matemáticas nativas de JS y asegurar el 0,000% de error.
4. **Testing Unitario:** Configurar Jest y escribir las primeras pruebas para el orquestador.

### Fase 2: Motor RAG y Procesamiento de la "Conciencia"
1. **Script de Ingesta:** Crear un script que lea recursivamente los `.md` de `brain/`, `consciousness/`, `instructions/` y `neurons/`.
2. **Vectorización:** Dividir el texto en chunks y convertirlos a embeddings usando la API de Google o un modelo local.
3. **Base de Datos Vectorial:** Guardar estos vectores en una instancia de base de datos (MongoDB Atlas Vector Search u otro).
4. **Actualizar el Orquestador:** Modificar `evaluateRetrievalContext` para que realmente consulte la DB vectorial en lugar de recibir un array hardcodeado.

### Fase 3: Integración del LLM y Capa de Enrutamiento
1. **Conexión API Gemini:** Crear el módulo que se comunique con Google AI Studio usando las llaves del `.env`.
2. **Enrutador (Nostradamuz):** Crear un agente supervisor (usando LangChain/LangGraph) que lea el input del usuario y decida a cuál de las 37 neuronas llamar.
3. **Capa de Guardrails Avanzada:** Reemplazar las comprobaciones por Regex (Aduana Atenea) con LLM-based evaluations (un modelo pequeño y rápido que valide la coherencia de la respuesta).

### Fase 4: Servidor Backend Middleware
1. **Crear Servidor API:** Levantar un servidor Express/Fastify.
2. **Exponer Endpoints:** Crear la ruta `/api/chat` que LibreChat consumirá (Custom Endpoint) o que actuará como intermediario.
3. **Inyectar el Orquestador:** Enchufar el `DanteOrchestrator` como middleware en esta ruta.

### Fase 5: Despliegue y UI (Futuro)
*(Fuera del alcance de las instrucciones actuales, pero requerido al final)*
1. Configurar `docker-compose.yml` final que incluya LibreChat, Mongo, y la API Middleware de Dante.
