-- Marketing campaigns system — Phase 1
-- marketing_campaigns: one per weekly campaign run per site
-- platform_credentials: API keys / Zapier webhook URLs per platform per site
-- Extends marketing_tasks with campaign linkage

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  site_type      text        NOT NULL,
  platforms      text[]      NOT NULL DEFAULT '{}',
  content_types  text[]      NOT NULL DEFAULT '{}',
  week_start     date        NOT NULL,
  timezone       text        NOT NULL DEFAULT 'America/Boise',
  status         text        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','active','paused','completed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_site_idx ON marketing_campaigns(site_id, week_start DESC);

CREATE TABLE IF NOT EXISTS platform_credentials (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  platform            text        NOT NULL,
  tier                text        NOT NULL CHECK (tier IN ('1','2','3')),
  zapier_webhook_url  text,
  ayrshare_profile_id text,
  account_id          text,
  connected           boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS creds_site_platform_idx ON platform_credentials(site_id, platform);

-- Extend marketing_tasks with campaign linkage and pipeline state
ALTER TABLE marketing_tasks
  ADD COLUMN IF NOT EXISTS campaign_id      uuid REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_type        text,
  ADD COLUMN IF NOT EXISTS platform         text,
  ADD COLUMN IF NOT EXISTS slot             text,
  ADD COLUMN IF NOT EXISTS research_data    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_brief    jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generated_assets jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_status  text DEFAULT 'draft'
                                            CHECK (approval_status IN ('draft','generating','pending_approval','approved','rejected','published','failed')),
  ADD COLUMN IF NOT EXISTS published_at     timestamptz,
  ADD COLUMN IF NOT EXISTS platform_post_id text,
  ADD COLUMN IF NOT EXISTS metrics          jsonb DEFAULT '{}';

CREATE INDEX IF NOT EXISTS tasks_campaign_idx ON marketing_tasks(campaign_id, approval_status);
CREATE INDEX IF NOT EXISTS tasks_approval_idx ON marketing_tasks(approval_status, created_at DESC);

-- Trigger for updated_at on campaigns
CREATE OR REPLACE FUNCTION update_updated_at_campaigns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS set_updated_at_campaigns ON marketing_campaigns;
CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_campaigns();
