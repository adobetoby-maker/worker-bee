-- Migration: 20260524000001_monetization
-- Adds invoices, invoice_items, affiliate_earnings, and ai_cost_log tables.
-- All tables reference sites(id) and are protected by RLS (service role bypasses).

-- ── invoices ──────────────────────────────────────────────────────────────────

create table if not exists invoices (
  id               uuid         primary key default gen_random_uuid(),
  site_id          uuid         references sites(id) on delete cascade,
  client_name      text         not null,
  client_email     text,
  invoice_number   text         unique not null,  -- e.g. 'INV-2026-001'
  status           text         not null default 'draft'
                                check (status in ('draft','sent','paid','overdue')),
  issued_date      date         not null default current_date,
  due_date         date,
  subtotal_cents   integer      not null default 0,
  tax_rate_pct     numeric(5,2) not null default 0,
  total_cents      integer      not null default 0,
  notes            text,
  paid_at          timestamptz,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

-- ── invoice_items ─────────────────────────────────────────────────────────────

create table if not exists invoice_items (
  id               uuid         primary key default gen_random_uuid(),
  invoice_id       uuid         not null references invoices(id) on delete cascade,
  description      text         not null,
  category         text         not null default 'service'
                                check (category in (
                                  'service',
                                  'ai-cost',
                                  'hosting',
                                  'affiliate-setup',
                                  'maintenance'
                                )),
  quantity         numeric(10,2) not null default 1,
  unit_price_cents integer      not null default 0,
  total_cents      integer      not null default 0,
  created_at       timestamptz  not null default now()
);

-- ── affiliate_earnings ────────────────────────────────────────────────────────

create table if not exists affiliate_earnings (
  id             uuid        primary key default gen_random_uuid(),
  site_id        uuid        not null references sites(id) on delete cascade,
  program_id     text        not null,  -- matches AffiliateProgram.id in lib/monetization.ts
  period_month   date        not null,  -- store as first of the month, e.g. 2026-05-01
  clicks         integer     not null default 0,
  conversions    integer     not null default 0,
  earnings_cents integer     not null default 0,
  currency       text        not null default 'USD',
  status         text        not null default 'pending'
                             check (status in ('pending','confirmed','paid')),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (site_id, program_id, period_month)
);

-- ── ai_cost_log ───────────────────────────────────────────────────────────────

create table if not exists ai_cost_log (
  id                  uuid        primary key default gen_random_uuid(),
  site_id             uuid        not null references sites(id) on delete cascade,
  session_date        date        not null default current_date,
  model               text        not null default 'claude-sonnet-4-6',
  input_tokens        integer     not null default 0,
  output_tokens       integer     not null default 0,
  cost_cents          integer     not null default 0,
  session_description text,
  billed              boolean     not null default false,
  created_at          timestamptz not null default now()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table invoices          enable row level security;
alter table invoice_items     enable row level security;
alter table affiliate_earnings enable row level security;
alter table ai_cost_log       enable row level security;

-- Service role (used by manage-worker-bee server) has full access to all tables.

create policy "service role full access invoices"
  on invoices for all
  using (auth.role() = 'service_role');

create policy "service role full access invoice_items"
  on invoice_items for all
  using (auth.role() = 'service_role');

create policy "service role full access affiliate_earnings"
  on affiliate_earnings for all
  using (auth.role() = 'service_role');

create policy "service role full access ai_cost_log"
  on ai_cost_log for all
  using (auth.role() = 'service_role');

-- ── Auto-update updated_at on invoices ───────────────────────────────────────

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Guard: only create trigger if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'invoices_updated_at'
  ) then
    create trigger invoices_updated_at
      before update on invoices
      for each row execute function update_updated_at();
  end if;
end;
$$;

-- ── Indexes for common query patterns ────────────────────────────────────────

-- Invoices: list by site + status (dashboard view)
create index if not exists idx_invoices_site_id_status
  on invoices (site_id, status);

-- Invoices: overdue detection (cron job candidate)
create index if not exists idx_invoices_due_date_status
  on invoices (due_date, status)
  where status in ('sent','overdue');

-- Invoice items: fetch all items for an invoice
create index if not exists idx_invoice_items_invoice_id
  on invoice_items (invoice_id);

-- Affiliate earnings: list by site + period (monthly report)
create index if not exists idx_affiliate_earnings_site_period
  on affiliate_earnings (site_id, period_month desc);

-- Affiliate earnings: aggregate by program across all sites
create index if not exists idx_affiliate_earnings_program_period
  on affiliate_earnings (program_id, period_month desc);

-- AI cost log: list unbilled sessions for invoicing
create index if not exists idx_ai_cost_log_site_billed
  on ai_cost_log (site_id, billed, session_date desc);
