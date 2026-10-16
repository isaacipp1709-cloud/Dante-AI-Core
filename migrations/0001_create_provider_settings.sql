-- Migracion LOCAL del Core. NO ejecutada contra Neon.
-- Persiste el estado activar/desactivar de proveedores. No altera tablas existentes.

create table if not exists provider_settings (
  provider_id text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
