# Matriz de Capacidades (Capability Matrix)

Este documento detalla las capacidades teóricas definidas en el repositorio frente al estado de implementación real.

| Capacidad / Órgano (John von Neumann) | Estado Teórico (Prompts/Docs) | Estado Implementación (Código) | Brecha a Cubrir |
| :--- | :--- | :--- | :--- |
| **Columna Vertebral (Gauss - Cálculos 0% Error)** | Definido en `.md`. Funciones en `orchestrator.js`. | `executeGaussAppOmega` existe, pero sin tests ni conexión a un intérprete. | Faltan tests unitarios exhaustivos (Jest) y un motor seguro para ejecutar fórmulas dinámicas. |
| **Corazón (Pascal - Cash Survival)** | Definido en `.md`. Función básica en `orchestrator.js`. | Cálculo estático en el orquestador. | Falta conexión real a APIs financieras o lectura de Excel/Sheets para obtener saldos. |
| **Ojo Tecnológico (Anubis)** | Neurona 13 documentada. | Nulo. | Falta integración de la neurona con un agente capaz de escribir/desplegar código real. |
| **Ojo de Mercado (Horus)** | Neurona 16 documentada. | Nulo. | Falta acceso a internet o RAG sobre bases de datos de mercado. |
| **Sistema Nervioso (Ramanujan - Enrutamiento)** | `nostradamuz_v4_core.md` define enrutamiento. | Nulo (Solo reglas de RAG en JS). | Falta un agente supervisor (LangChain/LlamaIndex) que rutee el prompt a la neurona adecuada. |
| **Aduana Atenea (Guardrails)** | Definido en `instructions/`. Función en `orchestrator.js`. | `sanitizeOutput` y `preFlightCheck` usan regex básicas. | Las regex (`/vacas vuelan/`) son frágiles. Se requiere un LLM evaluador o Guardrails.ai. |
| **Ejecutor (Dante - Manos y Terreno)** | Definido en `system_prompt_dante.md`. | Nulo. | Falta integración con Google Workspace API o Microsoft Graph API para generar documentos. |
