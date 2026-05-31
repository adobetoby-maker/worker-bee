CREATE TABLE IF NOT EXISTS leads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text        NOT NULL,
  phone         text,
  business_name text,
  city          text,
  services      text[]      NOT NULL DEFAULT '{}',
  current_site  text,
  budget        text,
  timeline      text,
  source        text,
  source_offer  text,
  notes         text,
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','scoped','won','lost')),
  resend_sent   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx  ON leads(email);
