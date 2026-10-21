# Dante AI Core — Continuidad del Proyecto y Estado de Producción Oficial

**Última Actualización:** 2026-10-21 (Producción Oficial Verificada en `main`, Matriz de 37 Neuronas y Ecosistema BYOK)  
**Rama Oficial de Producción:** `main` (Commit `232301a`)  
**Estado Certificado:** `PRODUCCIÓN VERIFICADA`  
**Endpoint Oficial Cloud:** `https://dante-ai-core.vercel.app`  
**Repositorio Privado de Configuración:** `https://isaacipp1709-cloud@github.com/isaacipp1709-cloud/Dante-Private-Config.git` (`main` / `5428d0e`)  

---

## 1. Visión y Arquitectura de Ejecución Cloud-First ($0.00 USD)

Dante AI opera como un organismo cognitivo desacoplado en la nube:
- **Dante-AI-Core:** Motor cognitivo, orquestación de 37 neuronas, adaptadores BYOK y persistencia relacional.
- **la-casa-de-dante:** Interfaz web HUD en Next.js 15 y React 19 (`https://la-casa-de-dante.vercel.app`).
- **Neon PostgreSQL:** Persistencia multi-inquilino de conversaciones, mensajes y credenciales cifradas con AES-256-GCM.
- **Supabase Auth:** Autenticación de usuarios vía GitHub OAuth PKCE con almacenamiento en memoria volátil de JS.
- **Dante Bridge:** Comunicación vía HTTP REST desde La Casa hacia Core firmada con HMAC-SHA256 (`x-dante-owner-assertion`).
- **Proveedores BYOK:** Google Gemini, NVIDIA NIM, Groq, OpenRouter y Hugging Face.

---

## 2. Estado de Infraestructura y Base de Datos (Neon)

- **Proyecto:** `Dante Ai Isaac` (`floral-glitter-53289276`)
- **Rama:** `production` (`br-proud-credit-b5keq62g`)
- **Endpoint:** `ep-quiet-forest-b571toev` (Directo) / `ep-quiet-forest-b571toev-pooler` (Pooler)
- **Base de Datos:** `neondb`
- **Tablas Activas y Auditadas:**
  - `conversations` (UUID PK, `owner_id`, `created_at`, `updated_at`, `mode`, `status`)
  - `messages` (UUID PK, `conversation_id`, `role`, `content`, `request_id`, `created_at`)
  - `provider_settings` (Configuración de modelos por proveedor)
  - `user_provider_credentials` (Credenciales BYOK cifradas con AES-256-GCM por `owner_id`)
- **Aislamiento Multi-Inquilino:** Estricto filtro `WHERE owner_id = $1::uuid` en el 100% de consultas relacionales.

---

## 3. Matriz de 37 Neuronas de John von Neumann

La API `/api/neurons` sirve las 37 neuronas organizadas en sus 7 lóbulos operativos:
1. **Lóbulo 1 (Finanzas):** N01 a N06 (CPA, Wealth, Aether, Business Plan, TOC, Cáryon Fintech).
2. **Lóbulo 2 (Matemáticas):** N07 a N12 (Chronos APP-Ω 0,000% Error, Probabilidad-Alfa, Axiom PhD, Tutor Inacap, Sheets, Economics).
3. **Lóbulo 3 (Software & Cloud):** N13 a N15 (Anubis Civil Informática, AppSheet, SPID UI/UX).
4. **Lóbulo 4 (Estrategia & Escala):** N16 a N21 (Horus Analytics SaaS, Chilean Venture Corfo, Innovación, Breathing Canvas, Ley REP, Asesor Político).
5. **Lóbulo 5 (Comunicación):** N22 a N28 (Correos C-Level, Protocolo Voz Humana, Linguist Polymath, Inglés Prometheus, Social Media, Escritor Creativo, Veo 3).
6. **Lóbulo 6 (Calidad Forense):** N29 a N34 (El Bibliotecario Cero Falsos, Notebook KLM, Guardián Forense 6 Filtros, Maquetador Idéntico, Film Archivist, Prompt Architect).
7. **Lóbulo 7 (Legal & Personas):** N35 a N37 (Strategic Legal SpA, Experto RR.HH Harvard, Ayuda Adulto Mayor).

---

## 4. Aseguramiento de Calidad y Pruebas

- **Suites Automatizadas:** 212/212 pruebas aprobadas al 100% (`npm test`).
- **Next.js Production Build:** Código de salida 0 sin advertencias críticas.
- **Auditoría de Secretos:** 0 fugas de tokens o connection strings.
- **Reversibilidad:** Tags inmutables `backup-pre-prod-main-2026-10-21` y `backup-pre-audit-2026-10-21`.
- **Expedientes Oficiales:** Archivados en `docs/informes/` y en pendrive físico `D:\Expediente_Jarvis_Dante_Produccion_2026-10-21\`.
