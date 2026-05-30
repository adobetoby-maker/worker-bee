-- Migration: 20260530_client_management
-- Adds full client management: clients, project costs, time tracking,
-- request intake, milestones, and Stripe fields on invoices.

-- ── clients ───────────────────────────────────────────────────────────────────

create table if not exists clients (
  id                  uuid         primary key default gen_random_uuid(),
  name                text         not null,
  email               text,
  phone               text,
  company             text,
  notes               text,
  stripe_customer_id  text,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

create index if not exists clients_name_idx on clients(name);

-- ── link sites → clients ──────────────────────────────────────────────────────

alter table sites
  add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists sites_client_idx on sites(client_id);

-- ── link invoices → clients ───────────────────────────────────────────────────

alter table invoices
  add column if not exists client_id              uuid         references clients(id) on delete set null,
  add column if not exists stripe_payment_link    text,
  add column if not exists stripe_payment_intent  text;

create index if not exists invoices_client_idx on invoices(client_id);

-- ── project_costs — recurring infra costs per site ───────────────────────────

create table if not exists project_costs (
  id             uuid         primary key default gen_random_uuid(),
  site_id        uuid         not null references sites(id) on delete cascade,
  service        text         not null,   -- vercel|supabase|railway|render|fal|comfy|domain|stripe|other
  label          text         not null,   -- display label e.g. "Vercel Pro"
  amount_cents   integer      not null default 0,
  billing_cycle  text         not null default 'monthly'
                              check (billing_cycle in ('monthly', 'annual', 'one-time')),
  notes          text,
  active         boolean      not null default true,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

create index if not exists project_costs_site_idx on project_costs(site_id);
create index if not exists project_costs_active_idx on project_costs(site_id, active);

-- ── time_entries — hours logged per project ───────────────────────────────────

create table if not exists time_entries (
  id           uuid          primary key default gen_random_uuid(),
  site_id      uuid          not null references sites(id) on delete cascade,
  date         date          not null default current_date,
  hours        numeric(6,2)  not null,
  rate_cents   integer       not null default 0,   -- hourly rate at time of entry
  description  text          not null,
  billed       boolean       not null default false,
  invoice_id   uuid          references invoices(id) on delete set null,
  created_at   timestamptz   not null default now()
);

create index if not exists time_entries_site_idx on time_entries(site_id, date desc);
create index if not exists time_entries_unbilled_idx on time_entries(site_id, billed) where not billed;

-- ── project_requests — intake log (phone, form, email) ───────────────────────

create table if not exists project_requests (
  id               uuid          primary key default gen_random_uuid(),
  client_id        uuid          references clients(id) on delete set null,
  site_id          uuid          references sites(id) on delete set null,
  source           text          not null default 'phone'
                                 check (source in ('phone', 'form', 'email', 'message', 'other')),
  title            text          not null,
  description      text,
  status           text          not null default 'new'
                                 check (status in ('new','scoped','quoted','approved','in_progress','complete','declined')),
  estimated_hours  numeric(8,2),
  estimated_cents  integer,
  notes            text,
  received_at      timestamptz   not null default now(),
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

create index if not exists requests_client_idx  on project_requests(client_id);
create index if not exists requests_status_idx  on project_requests(status);
create index if not exists requests_received_idx on project_requests(received_at desc);

-- ── project_milestones — custom gates per project ────────────────────────────

create table if not exists project_milestones (
  id            uuid         primary key default gen_random_uuid(),
  site_id       uuid         not null references sites(id) on delete cascade,
  title         text         not null,
  description   text,
  status        text         not null default 'pending'
                             check (status in ('pending','in_progress','complete','blocked')),
  sort_order    integer      not null default 0,
  completed_at  timestamptz,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

create index if not exists milestones_site_idx on project_milestones(site_id, sort_order);

-- ── share_tokens — client-facing read-only cork board tokens ─────────────────

create table if not exists share_tokens (
  id         uuid         primary key default gen_random_uuid(),
  site_id    uuid         not null references sites(id) on delete cascade,
  token      text         not null unique,
  label      text,                        -- "Jay's portal link"
  active     boolean      not null default true,
  created_at timestamptz  not null default now()
);

create index if not exists share_tokens_token_idx on share_tokens(token);
create index if not exists share_tokens_site_idx  on share_tokens(site_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  for tbl in select unnest(array['clients','project_costs','project_requests','project_milestones']) loop
    execute format(
      'drop trigger if exists set_updated_at on %I;
       create trigger set_updated_at before update on %I
       for each row execute function update_updated_at();', tbl, tbl);
  end loop;
end $$;
