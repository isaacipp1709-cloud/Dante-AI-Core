-- Comprobaciones de SOLO LECTURA para la migración 0000.
-- No modifican datos ni esquema.

-- 1. Comprobar existencia de tablas en el esquema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'messages')
ORDER BY table_name;

-- 2. Comprobar columnas de conversations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;

-- 3. Comprobar columnas de messages
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages'
ORDER BY ordinal_position;

-- 4. Comprobar índices y llaves foráneas
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages')
ORDER BY tablename, indexname;
