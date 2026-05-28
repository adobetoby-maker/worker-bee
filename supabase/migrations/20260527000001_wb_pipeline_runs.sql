-- WB Pipeline runs — one row per "push to worker bee" invocation per site
create table if not exists wb_pipeline_runs (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references sites(id) on delete cascade,
  run_at        timestamptz not null default now(),
  triggered_by  text not null default 'claude',  -- 'claude' | 'manual' | 'cron'
  phases        jsonb not null default '{}',      -- { seo, cso, monetization, blueprint, vault, affiliate }
  seo_score     smallint,
  cso_score     smallint,
  changes       text[] not null default '{}',     -- list of what changed this run
  recommendations text[] not null default '{}',   -- residual recommendations
  affiliate_matches jsonb default '[]',           -- [{name, category, url, commission}]
  monetization_summary text,
  summary       text,
  status        text not null default 'complete'
    check (status in ('running','complete','error'))
);

alter table wb_pipeline_runs enable row level security;

create policy "service role full access wb_pipeline_runs"
  on wb_pipeline_runs for all using (auth.role() = 'service_role');

create index wb_pipeline_runs_site_id_run_at
  on wb_pipeline_runs (site_id, run_at desc);
