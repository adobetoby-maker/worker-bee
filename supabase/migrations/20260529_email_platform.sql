-- contacts: per-site subscriber list
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  site_id text not null,
  source text not null default 'trifold',
  subscribed boolean not null default true,
  resend_contact_id text,
  tags text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(email, site_id)
);

create index if not exists contacts_site_id_idx on contacts(site_id);
create index if not exists contacts_email_idx on contacts(email);
create index if not exists contacts_subscribed_idx on contacts(subscribed);

-- campaigns
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_id text not null,
  type text not null default 'broadcast',
  status text not null default 'draft',
  subject text,
  preview_text text,
  from_name text,
  from_email text,
  html_body text,
  ai_prompt text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_site_id_idx on campaigns(site_id);
create index if not exists campaigns_status_idx on campaigns(status);

-- drip steps
create table if not exists drip_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  step_number int not null,
  delay_hours int not null default 24,
  subject text not null,
  preview_text text,
  html_body text,
  created_at timestamptz not null default now(),
  unique(campaign_id, step_number)
);

-- send log
create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status text not null default 'sent',
  resend_email_id text,
  sent_at timestamptz not null default now(),
  unique(campaign_id, contact_id)
);

create index if not exists campaign_sends_campaign_idx on campaign_sends(campaign_id);
create index if not exists campaign_sends_contact_idx on campaign_sends(contact_id);
