# Dante AI Core — Continuidad del Proyecto y Estado de Rescate

**Última Actualización:** 2026-10-18 (Cierre de Sesión y Traslado al Laptop de Isaac)  
**Rama Activa de Rescate:** `rescue/isaac-2026-10-18`  
**Repositorio Privado de Configuración:** `https://github.com/isaacipp1709-cloud/Dante-Private-Config.git`

---

## 1. Visión y Arquitectura de Ejecución

Dante AI opera bajo una arquitectura desacoplada orientada a la **nube (Cloud-First)**:
- **Dante-AI-Core:** Motor cognitivo, orquestación de neuronas y persistencia relacional.
- **la-casa-de-dante:** Interfaz web de usuario construida en Next.js con frontend en Vercel.
- **Neon PostgreSQL:** Persistencia de estado y bóveda relacional de credenciales.
- **Supabase:** Autenticación de usuarios vía GitHub OAuth.
- **Dante Bridge:** Comunicación vía HTTP REST desde La Casa hacia Core (`DANTE_MODE !== 'mock'`).

> **REGLA DE ORO:** No ejecutar servidores locales persistentes ni Docker. La solución final corre 100% en la nube para permitir el uso desde cualquier dispositivo móvil o de escritorio.

---

## 2. Estado de Infraestructura y Base de Datos (Neon)

- **Proyecto:** `Dante Ai Isaac` (`floral-glitter-53289276`)
- **Rama:** `production` (`br-proud-credit-b5keq62g`)
- **Endpoint:** `ep-quiet-forest-b571toev` (Directo) / `ep-quiet-forest-b571toev-pooler` (Pooler)
- **Base de Datos:** `neondb`
- **Tablas Detectadas en Neon:**
  - `provider_settings` (Existe, 0 filas)
  - `user_provider_credentials` (Existe, 0 filas)
- **Bloqueo Actual:**
  - `conversations` (NO EXISTE en Neon)
  - `messages` (NO EXISTE en Neon)

### Solución Preparada:
Ejecutar la migración base en el SQL Editor de Neon Console:
1. `migrations/0000_create_conversations_and_messages.sql`
2. Verificar con `migrations/0000_checks.sql`

---

## 3. Respaldo de Configuración y Secretos

Todas las credenciales requeridas (`DATABASE_URL`, claves de proveedores, tokens de Supabase) están empaquetadas de forma cifrada en:
- Repositorio Privado: `isaacipp1709-cloud/Dante-Private-Config`
- Archivo: `dante-config-2026-10-18.dantevault`
- **SHA-256:** `DBE4E3C5914FBB1E84400D279BF5EE1C615E3F43B41FA3C463E3902CA842E013`

Para desbloquear en memoria e inspeccionar:
```bash
npm run vault
# Abrir http://127.0.0.1:4179
```

---

## 4. Estado de Pruebas y Calidad de Código

- Suites de Core: **26 suites, 185 tests pasados (0 fallos)**
- Bóveda de Configuración: **1 suite, 12 tests pasados (0 fallos)**
- Cero fugas de credenciales en Git.

---

## 5. Hoja de Ruta Inmediata para Isaac en su Laptop

1. Clonar `Dante-AI-Core` en la rama `rescue/isaac-2026-10-18`.
2. Aplicar la migración SQL `migrations/0000_create_conversations_and_messages.sql` en Neon.
3. Desplegar `Dante-AI-Core` en Vercel como servicio web backend.
4. Conectar `la-casa-de-dante` en Vercel con la URL remota de Core vía `DANTE_CORE_URL`.
