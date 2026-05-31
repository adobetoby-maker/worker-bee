-- Marketing droid status table — tracks last run time and report per droid
CREATE TABLE IF NOT EXISTS marketing_droid_status (
  droid_id        text PRIMARY KEY,
  status          text,
  channel         text,
  last_ran_at     timestamptz,
  report          text,
  sites_processed int,
  updated_at      timestamptz DEFAULT now()
);
