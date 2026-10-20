# Bitácora de Trabajo — Alineación de Modelo Gemini Vigente y Rechazo de Overrides Obsoletos

**Fecha:** 2026-10-20  
**Rama:** `rescue/isaac-2026-10-18`  
**Repositorio:** `Dante-AI-Core`

---

## 1. Diagnóstico y Evidencia Oficial (Google Gemini API)

De acuerdo con la documentación oficial vigente de Google Gemini API (`gemini-api-guides/models.md`, `gemini-api-guides/deprecations.md`, `gemini-api-guides/pricing.md`, `gemini-api-guides/models/gemini-2.0-flash.md`, `gemini-api-guides/models/gemini-3.8-flash.md` y `gemini-api-guides/models/gemini-3.5-flash-lite.md`):

1. **Retiro definitivo de la serie 2.0 (`gemini-2.0-flash`, `gemini-2.0-flash-001`, `gemini-2.0-flash-lite`):** Dados de baja (*shut down*) el **1 de junio de 2026**. El endpoint ya no está disponible.
2. **Restricción de acceso en la serie 2.5 (`gemini-2.5-flash`, `gemini-2.5-flash-lite`):** Google limita el acceso a los modelos 2.5 únicamente a cuentas con uso histórico previo y recomienda explícitamente para proyectos nuevos: **`gemini-3.8-flash`** o **`gemini-3.5-flash-lite`**.
3. **Modelos vigentes aprobados con nivel gratuito documentado:**
   - **`gemini-3.8-flash` (Default aprobado):** Estable (GA, lanzado el 2 de septiembre de 2026), sin fecha de retiro anunciada (`No shutdown date announced`) y con nivel gratuito estándar documentado (`Input price: Free of charge`, `Output price (including thinking tokens): Free of charge`, `Context caching: Free of charge`).
   - **`gemini-3.5-flash-lite` (Secundario permitido en catálogo):** Estable (GA, lanzado el 21 de julio de 2026), sin fecha de retiro anunciada y con nivel gratuito estándar documentado (`Free of charge` en entrada y salida).
4. **Compatibilidad con SDK `@google/generative-ai` (`^0.24.1`):** El cliente construye dinámicamente la ruta `v1beta/models/${model}:generateContent` con el contrato estándar `contents`/`candidates`/`usageMetadata`, sin requerir actualización ni reinstalación de paquetes.

---

## 2. Cambios Implementados en `Dante-AI-Core`

- **`src/orchestrator/credentials/byok-executor.ts`:**
  - Unificación de constantes `DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'`, `DEFAULT_BYOK_GEMINI_MODEL = DEFAULT_GEMINI_MODEL` y `ALLOWED_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const`.
  - Implementación de `InvalidGeminiModelError` (`code = 'INVALID_MODEL'`), `isAllowedGeminiModel` y `resolveGeminiModel`, rechazando explícitamente modelos obsoletos o restringidos (`gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.5-*`, `gemini-1.5-*`, `gemini-pro`) tanto en overrides de solicitud como en `process.env.DEFAULT_GEMINI_MODEL`.
- **`src/orchestrator/providers/gemini.ts`:**
  - Reutilización de `DEFAULT_GEMINI_MODEL` y `resolveGeminiModel` desde `byok-executor.ts`.
  - Actualización del nombre descriptivo del proveedor a `'Google Gemini'`.
- **`src/orchestrator/credentials/byok-turn.ts` y `src/app/api/chat/route.ts`:**
  - Validación y resolución del modelo en `runByokChatTurn` antes de invocar al ejecutor (`executionInvocations: 0` ante `INVALID_MODEL`), mapeando `INVALID_MODEL` a `HTTP 400` en `/api/chat`.
- **`tests/credentials/byok-turn.test.ts`:**
  - Pruebas unitarias aisladas verificando selección por defecto (`gemini-3.8-flash`), preservación de modelos permitidos (`gemini-3.8-flash`, `gemini-3.5-flash-lite`), rechazo de overrides obsoletos sin invocar al proveedor y cero llamadas de red.
