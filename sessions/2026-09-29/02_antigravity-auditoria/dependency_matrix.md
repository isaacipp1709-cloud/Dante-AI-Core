# Matriz de Dependencias (Dependency Matrix)

Para que el ecosistema pase de ser un conjunto de reglas (Markdown + JS puro) a un software ejecutable, se identifican las siguientes dependencias técnicas faltantes:

## 1. Dependencias Core (Backend)
- **Node.js** (Entorno de ejecución).
- **TypeScript** (Recomendado para estricto control de tipos en los cálculos de Gauss).
- **Express / Fastify** (Framework HTTP para la API).
- **dotenv** (Para cargar el `.env.example`).

## 2. Dependencias de Inteligencia Artificial (LLM & RAG)
- **@google/genai** o **@google/generative-ai** (Para invocar a Gemini 1.5 Pro).
- **LangChain.js** o **LlamaIndex.ts** (Framework de orquestación de agentes y RAG).
- Motor de Embeddings (Ej. HuggingFace Transformers.js o Google Embeddings).
- Base de datos Vectorial (MongoDB Atlas Vector Search u opciones locales como ChromaDB).

## 3. Dependencias de Calidad y Testing
- **Jest / Mocha** (Para validar la tolerancia 0,000% de error de cálculo).
- **ESLint / Prettier** (Calidad de código).

## 4. Dependencias de Infraestructura
- **Docker & Docker Compose** (Para levantar LibreChat junto con el middleware de Dante).
- **LibreChat** (Instancia real, actualmente solo existe el `yaml`).
