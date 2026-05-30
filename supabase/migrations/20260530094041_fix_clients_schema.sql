-- Migration: fix_clients_schema
-- The clients table pre-existed (from Anderton & Associates).
-- Add missing columns that the CREATE TABLE IF NOT EXISTS skipped.

alter table clients
  add column if not exists stripe_customer_id  text,
  add column if not exists updated_at          timestamptz not null default now();

alter table sites
  add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists sites_client_idx on sites(client_id);

alter table invoices
  add column if not exists client_id              uuid references clients(id) on delete set null,
  add column if not exists stripe_payment_link    text,
  add column if not exists stripe_payment_intent  text;

create index if not exists invoices_client_idx on invoices(client_id);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at on clients;
create trigger set_updated_at
  before update on clients
  for each row execute function update_updated_at();
