-- credentials: per-row vault storage (replaces vault_storage blob)
-- Sensitive fields (password_enc, api_key_enc, notes_enc) are AES-256-GCM encrypted client-side.
-- All other fields are plaintext and queryable.
create table if not exists credentials (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  category text not null,
  site text,
  project text,
  username text,
  password_enc text,      -- encrypted: { salt, iv, authTag, data } JSON
  api_key_enc text,       -- encrypted: { salt, iv, authTag, data } JSON
  host text,
  port text,
  db_name text,           -- "database" is reserved in postgres
  notes_enc text,         -- encrypted: { salt, iv, authTag, data } JSON
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credentials_category_idx on credentials(category);
create index if not exists credentials_project_idx on credentials(project);
create index if not exists credentials_site_idx on credentials(site);
