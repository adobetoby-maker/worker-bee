ALTER TABLE sites ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'site';
COMMENT ON COLUMN sites.category IS 'site | product | white-label';
