# ARCHITECTURE.md — Dante-AI-Core

## Visión General

Dante-AI-Core es el núcleo cognitivo del sistema Dante AI. Opera como organismo cognitivo general, no como un asistente financiero específico. Los módulos financieros son una capacidad opcional, no el dominio central.

---

## Evolución del Contexto

### Contexto Anterior (acoplado)
El orchestrator exigía `FinancialContext` con campos obligatorios (`cajaDisponibleCLP`, `sueldosLiquidosMensualesCLP`). Esto acoplaba a Dante al dominio financiero, impidiendo su uso como organismo cognitivo general.

### Contexto Actual (desacoplado)

Se introdujo una unión de tipos `DanteContext` que permite al orquestador procesar cualquier tipo de contexto:

```ts
// src/verification/context.ts
type DanteContext = FinancialContext | GeneralContext;
```

#### `GeneralContext` (dominio agnóstico)
```ts
// src/verification/general-context.ts
{
  timezone: string;      // IANA timezone. Default: 'UTC'
  locale: string;        // IETF language tag. Default: 'es-CL'
  userId?: string;       // UUID v4 del usuario (opcional)
  capabilities?: string[]; // Capacidades habilitadas (opcional)
  constraints?: string[];  // Restricciones de operación (opcional)
}
```

#### `FinancialContext` (dominio financiero)
```ts
// Definido en src/orchestrator.ts
{
  cajaDisponibleCLP: number | bigint;            // Obligatorio
  sueldosLiquidosMensualesCLP: number | bigint;  // Obligatorio
  ventasNetasCLP?: number | bigint;
  comprasNetasCLP?: number | bigint;
  remanenteAnteriorCLP?: number | bigint;
  valorUF?: string;
}
```

#### Type Guards
```ts
isFinancialContext(ctx: DanteContext): ctx is FinancialContext
isGeneralContext(ctx: DanteContext): ctx is GeneralContext
```
Estos guards son mutuamente excluyentes. El orquestador solo ejecuta lógica financiera cuando `isFinancialContext(ctx)` es `true`.

---

## Contrato de Contexto

### Campos del Request (La Casa → Core)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `messages` | `DanteMessage[]` | Sí | Historial de conversación |
| `conversationId` | UUID v4 | No | Identifica el hilo de conversación |
| `userId` | UUID v4 | No | Identifica al usuario |
| `context.timezone` | string IANA | No (default: UTC) | Zona horaria del cliente |
| `context.locale` | string IETF | No (default: es-CL) | Locale del cliente |
| `context.capabilities` | string[] | No | Capacidades habilitadas |
| `context.constraints` | string[] | No | Restricciones activas |

### Headers HTTP (Bridge → Core)

| Header | Valor | Fuente |
|---|---|---|
| `X-User-Timezone` | IANA timezone | `context.timezone` o `America/Santiago` |
| `X-User-Locale` | IETF tag | `context.locale` o `es-CL` |
| `X-User-ID` | UUID v4 o `""` | `userId` del request |
| `X-Conversation-ID` | UUID v4 o `local-{ts}` | `conversationId` o generado |

### Nota de Entorno

Este contrato es **agnóstico al entorno**: funciona igual en local (`localhost:3001`) y en producción (`vercel.app`).
La única diferencia es la variable de entorno `DANTE_CORE_URL` y `DANTE_MODE`.

---

## Modos de Operación

| Variable | Valor | Comportamiento |
|---|---|---|
| `DANTE_MODE` | `mock` (default) | La Casa responde con MockDanteProvider |
| `DANTE_MODE` | `local-core` | La Casa hace fetch HTTP al Core real |
| `USE_DATABASE` | `true` | Core persiste conversaciones en Neon |
| `USE_DATABASE` | (ausente) | Core opera completamente en memoria |

---

## Capas Protegidas (NO modificar sin autorización de Isaac)

```text
src/orchestrator.ts      → Solo tipos en OrchestratorInput
src/runtime/             → Prohibido
src/neurons/             → Prohibido
src/verification/        → Solo lectura (excepto general-context.ts y context.ts)
```

---

## Autenticación

**Mecanismo:** Bearer token (RFC 6750). Server-to-server únicamente.

**Header:** `Authorization: Bearer <token>`

**Variables:**

| Variable | Capa | Visibilidad |
|---|---|---|
| `DANTE_CORE_TOKEN` | Core (validación) | Server-only |
| `DANTE_CORE_TOKEN` | Casa (inyección) | Server-only (NO `NEXT_PUBLIC_`) |

**Rotación de token:**
1. Generar nuevo token:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Actualizar `.env.local` en Core **y** Casa con el mismo valor.
3. Reiniciar ambos servicios.

**Seguridad:**
- Nunca exponer el token en cliente web, Git, Markdown o logs.
- Token opaco (hex 64 chars), sin información embebida (no JWT).
- En caso de compromiso: rotar inmediatamente (Paso 1-3).
- `.env.local` está cubierto por `.gitignore` en ambos repositorios.

---

## Persistencia

Proveedor: Neon PostgreSQL.

Tablas:
- `conversations`: ID, external_id, timestamps, mode, status.
- `messages`: ID, conversation_id, role, content, request_id, timestamp.

Variables:
- `DATABASE_URL` (server-only).
- `USE_DATABASE` (true/false).

Seguridad:
- Nunca exponer DATABASE_URL en cliente o logs.
- Queries parametrizadas (no SQL construido con strings).
