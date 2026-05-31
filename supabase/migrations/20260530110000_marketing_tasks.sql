-- Marketing runs (already created, ensure exists)
CREATE TABLE IF NOT EXISTS marketing_runs (
  id uuid primary key default gen_random_uuid(),
  droid_id text not null unique,
  status text default 'never_run',
  channel text,
  last_run timestamptz,
  notes text,
  run_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Marketing tasks: completed log, todo queue, could-do backlog
CREATE TABLE IF NOT EXISTS marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  droid_id text not null,
  type text not null check (type in ('completed','todo','could_do')),
  text text not null,
  site text,
  channel text,
  done boolean default false,
  promoted_from text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS marketing_tasks_droid_idx ON marketing_tasks(droid_id);
CREATE INDEX IF NOT EXISTS marketing_tasks_type_idx ON marketing_tasks(type);
CREATE INDEX IF NOT EXISTS marketing_tasks_done_idx ON marketing_tasks(done);
