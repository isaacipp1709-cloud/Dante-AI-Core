# Registro de Riesgos y Errores (Risk Register)

Se han identificado los siguientes errores y riesgos críticos en el repositorio en su estado actual:

## 🔴 Riesgos Críticos (Bloqueantes)
1. **Falta de Servidor/API:** `dante_runtime_orchestrator.js` es inútil sin un servidor que lo ejecute e integre en el flujo de peticiones.
2. **No existe Ingesta de RAG:** El código de orquestación asume que los documentos ya están en formato *chunks* y calificados (`documentChunks.filter(chunk => chunk.score >= 0.88)`), pero no hay código que lea la carpeta `neurons/` ni genere embeddings.
3. **Guardrails Basados en Regex Frágiles:** La validación anti-alucinaciones de `preFlightCheck` usa expresiones regulares fijas (ej. `/vacas vuelan/`). Esto es un riesgo masivo para un sistema que promete alta seguridad, ya que es trivial de eludir o puede arrojar falsos positivos.
4. **Falta de Gestión de Dependencias:** No hay un `package.json`, impidiendo la instalación sistemática del proyecto en otros entornos.

## 🟠 Riesgos Mayores
5. **Cálculos Estáticos Peligrosos:** `executeGaussAppOmega` utiliza fórmulas fijas para impuestos (19% IVA). Si la normativa chilena cambia, el código estático fallará. Falta un diseño modular o dinámico.
6. **Tolerancia a Errores no Garantizada:** El sistema exige 0,000% de error (Columna Vertebral de Gauss), pero al estar en JavaScript plano, está sujeto a problemas de precisión de punto flotante. Se debe migrar a TypeScript o usar librerías como `decimal.js` o `bignumber.js`.
7. **Ausencia de Tests Unitarios:** Imposible auditar y garantizar matemáticamente que las funciones cumplen su promesa sin una suite de pruebas.

## 🟡 Riesgos Menores
8. **Configuración Incompleta:** El `librechat.yaml` hace referencia a presets, pero LibreChat requiere su propia instalación (MongoDB, dependencias, frontend).
9. **Manejo de Errores Inadecuado:** El orquestador lanza errores (`throw new Error`) de forma síncrona. En un entorno web sin capturador (try/catch a nivel controlador), esto tumbará el servidor.
10. **Seguridad de Tokens:** El archivo `.env.example` contiene JWT_SECRETS y claves quemadas de ejemplo; asegurar que no se suban `.env` reales.
