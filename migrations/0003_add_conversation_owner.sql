-- Migracion LOCAL. NO ejecutada. Propiedad de conversaciones por usuario verificado.
-- Compatible con datos existentes: columna anulable, sin borrados ni reasignaciones.

alter table conversations
  add column if not exists owner_id uuid null;

-- Indice para listados y lecturas acotadas al propietario.
create index if not exists conversations_owner_idx
  on conversations (owner_id, updated_at desc);

-- La unicidad del external_id se mantiene: un id ajeno NO se reasigna.
-- (Verificado antes de aplicar: no se crea indice unico nuevo ni se elimina el existente.)
