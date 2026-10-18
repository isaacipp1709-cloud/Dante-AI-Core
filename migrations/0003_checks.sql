-- Comprobaciones de SOLO LECTURA para la migracion 0003. NO ejecutar a ciegas.
-- Se ejecutan ANTES y DESPUES; no modifican datos ni esquema.

-- PRE 1: la tabla existe y que columnas tiene HOY (sin referenciar owner_id)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'conversations'
order by ordinal_position;

-- PRE 2: indices y unicidad actuales
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'conversations';

-- PRE 3: volumen y cuantas filas quedarian historicas (solo si owner_id YA existe)
-- Si owner_id no existe, esta consulta debe OMITIRSE: es el error que corregimos.
select count(*) as total from public.conversations;

-- POST 1: tipo y nulabilidad reales de la columna nueva (ADD COLUMN IF NOT EXISTS
-- no garantiza el tipo si la columna ya existia con otro tipo)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'conversations' and column_name = 'owner_id';

-- POST 2: el indice esperado existe
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'conversations'
  and indexname = 'conversations_owner_idx';

-- POST 3: aislamiento: todo acceso de la aplicacion filtra por owner_id.
-- Historico: permanece sin propietario y fuera del acceso normal (no se toca).
select count(*) as historicas_sin_dueno
from public.conversations where owner_id is null;

-- POST 4: ninguna conversacion quedo con propietario asignado automaticamente
-- (el conteo POST 3 debe ser identico al PRE 3 si no hubo altas nuevas).
