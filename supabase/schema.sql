create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  stack text not null default 'nextjs'
    check (stack in ('nextjs','wordpress','react','static','other')),
  status text not null default 'active'
    check (status in ('active','paused','issue')),
  github_repo text,
  vercel_project_id text,
  wp_api_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table sites enable row level security;

create policy "service role full access sites"
  on sites for all using (auth.role() = 'service_role');
