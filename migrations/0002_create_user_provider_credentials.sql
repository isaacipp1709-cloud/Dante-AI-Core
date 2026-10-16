-- Migracion LOCAL de Dante-AI-Core. NO ejecutada contra Neon.
-- Credenciales BYOK cifradas, asociadas al propietario autenticado.
-- No usa drop ni altera tablas existentes.

create table if not exists public.user_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  provider_id text not null,
  credential_id text not null unique,
  algorithm text not null,
  iv text not null,
  auth_tag text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_provider_credentials_owner_idx
  on public.user_provider_credentials (owner_id);
