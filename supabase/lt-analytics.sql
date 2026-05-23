-- Language Threshold analytics schema
-- Run once in Supabase SQL editor: https://supabase.com/dashboard → SQL editor
-- All tables use RLS: anon/authenticated can INSERT, service role reads everything.

-- ── Field Prep session events ──────────────────────────────────────────────
create table if not exists lt_field_prep_events (
  id                       uuid    default gen_random_uuid() primary key,
  session_id               text    not null,
  user_id                  uuid    references auth.users(id) on delete set null,
  scenario_id              text    not null,
  language                 text    not null,
  mission_area             text,
  exchanges_count          integer default 0,
  feedback_requested_count integer default 0,
  used_voice               boolean default false,
  duration_seconds         integer,
  completed                boolean default false,
  created_at               timestamptz default now()
);

alter table lt_field_prep_events enable row level security;

create policy "lt_fp_public_insert"
  on lt_field_prep_events for insert
  to anon, authenticated
  with check (true);

-- ── General app events ────────────────────────────────────────────────────
create table if not exists lt_app_events (
  id          uuid        default gen_random_uuid() primary key,
  session_id  text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  event_type  text        not null,
  language    text,
  mission_area text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

alter table lt_app_events enable row level security;

create policy "lt_ae_public_insert"
  on lt_app_events for insert
  to anon, authenticated
  with check (true);

-- ── User feedback ─────────────────────────────────────────────────────────
create table if not exists lt_feedback (
  id            uuid        default gen_random_uuid() primary key,
  session_id    text,
  user_id       uuid        references auth.users(id) on delete set null,
  feedback_type text        not null, -- 'field_prep_session' | 'general' | 'review'
  rating        integer     check (rating between 1 and 5),
  comment       text,
  scenario_id   text,
  language      text,
  mission_area  text,
  created_at    timestamptz default now()
);

alter table lt_feedback enable row level security;

create policy "lt_fb_public_insert"
  on lt_feedback for insert
  to anon, authenticated
  with check (true);

-- ── Lightweight error log ─────────────────────────────────────────────────
create table if not exists lt_error_logs (
  id          uuid        default gen_random_uuid() primary key,
  session_id  text,
  user_id     uuid        references auth.users(id) on delete set null,
  error_type  text        not null,
  message     text        not null,
  context     jsonb,
  created_at  timestamptz default now()
);

alter table lt_error_logs enable row level security;

create policy "lt_el_public_insert"
  on lt_error_logs for insert
  to anon, authenticated
  with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────
create index if not exists lt_fp_events_scenario  on lt_field_prep_events (scenario_id);
create index if not exists lt_fp_events_language  on lt_field_prep_events (language);
create index if not exists lt_fp_events_created   on lt_field_prep_events (created_at desc);
create index if not exists lt_ae_events_type      on lt_app_events (event_type);
create index if not exists lt_ae_events_created   on lt_app_events (created_at desc);
create index if not exists lt_fb_created          on lt_feedback (created_at desc);
create index if not exists lt_el_created          on lt_error_logs (created_at desc);
