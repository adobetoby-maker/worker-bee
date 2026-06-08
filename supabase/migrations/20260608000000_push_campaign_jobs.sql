-- Push campaign automation tables
-- push_campaigns: one per "launch" event (manual or auto-triggered by email send)
-- push_campaign_jobs: one per site × channel pair

CREATE TABLE IF NOT EXISTS push_campaigns (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  trigger_type    text        NOT NULL DEFAULT 'manual'
                              CHECK (trigger_type IN ('manual', 'email_send')),
  niche           text,
  status          text        NOT NULL DEFAULT 'running'
                              CHECK (status IN ('running', 'completed', 'failed')),
  total_jobs      int         NOT NULL DEFAULT 0,
  completed_jobs  int         NOT NULL DEFAULT 0,
  failed_jobs     int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE TABLE IF NOT EXISTS push_campaign_jobs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid        NOT NULL REFERENCES push_campaigns(id) ON DELETE CASCADE,
  channel_id       text        NOT NULL,
  channel_name     text        NOT NULL,
  site_id          text        NOT NULL,
  site_name        text        NOT NULL,
  site_url         text        NOT NULL,
  automation_level text        NOT NULL DEFAULT 'partial'
                               CHECK (automation_level IN ('full', 'partial', 'manual')),
  status           text        NOT NULL DEFAULT 'queued'
                               CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped', 'pending_user')),
  content          jsonb,
  submit_url       text,
  result_url       text,
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS push_campaign_jobs_campaign_idx ON push_campaign_jobs(campaign_id, status);
CREATE INDEX IF NOT EXISTS push_campaign_jobs_created_idx  ON push_campaigns(created_at DESC);
