-- ATLAS Bridge schema — Phase 1 (PRD-atlas-platform-2026-07-05 §4.1)
-- Telemetry-UP mirror tables + command-DOWN queue.
-- Written by ATLAS 2026-07-05. Idempotent (IF NOT EXISTS everywhere).
-- RLS: enabled on all tables, NO policies — service-role only access.
-- Canonical copy: ~/.atlas/bridge/schema.sql
-- Migration copy: manage-worker-bee/supabase/migrations/20260705120000_atlas_bridge.sql

create table if not exists atlas_needs (
  id             text primary key,
  payload        jsonb,
  type           text,
  state          text,
  priority_score numeric,
  source         text,
  updated_at     timestamptz,
  synced_at      timestamptz
);

create table if not exists atlas_missions (
  id        text primary key,
  name      text,
  payload   jsonb,
  gate_pass boolean,
  beauty    numeric,
  quality   text,
  state     text,
  synced_at timestamptz
);

create table if not exists atlas_qa (
  slug      text primary key,
  url       text,
  state     text,
  latest    jsonb,
  runs      jsonb,
  synced_at timestamptz
);

create table if not exists atlas_receipts (
  id         text primary key,
  agent      text,
  task       text,
  status     text,
  exit_code  int,
  duration_s numeric,
  payload    jsonb,
  started_at timestamptz,
  synced_at  timestamptz
);

create table if not exists atlas_health (
  key       text primary key,
  value     jsonb,
  synced_at timestamptz
);

-- entry is UNIQUE (not in the minimal spec) so PostgREST upserts stay
-- idempotent against a serial pk — re-syncing the craft record must not
-- duplicate rows.
create table if not exists atlas_craft (
  id        serial primary key,
  entry     text unique,
  logged_at timestamptz,
  synced_at timestamptz
);

create table if not exists atlas_sessions (
  name        text primary key,
  id          text,
  description text,
  status      text,
  synced_at   timestamptz
);

create table if not exists atlas_briefs (
  id        text primary key,
  date      date,
  content   text,
  synced_at timestamptz
);

create table if not exists atlas_commands (
  id            uuid primary key default gen_random_uuid(),
  type          text,
  payload       jsonb,
  status        text default 'pending',
  requested_by  text,
  created_at    timestamptz default now(),
  dispatched_at timestamptz,
  completed_at  timestamptz,
  result        jsonb
);

-- RLS: enable everywhere, define no policies.
-- anon/authenticated get nothing; service_role bypasses RLS.
alter table atlas_needs    enable row level security;
alter table atlas_missions enable row level security;
alter table atlas_qa       enable row level security;
alter table atlas_receipts enable row level security;
alter table atlas_health   enable row level security;
alter table atlas_craft    enable row level security;
alter table atlas_sessions enable row level security;
alter table atlas_briefs   enable row level security;
alter table atlas_commands enable row level security;
