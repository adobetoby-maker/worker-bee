-- Marketing Command OS: offers + site inventory tables
-- Additive only — does not touch existing leads/contacts/campaigns/marketing_tasks

CREATE TABLE IF NOT EXISTS marketing_offers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  slug             text        NOT NULL UNIQUE,
  lane             text        NOT NULL,
  price_min        integer     NOT NULL DEFAULT 0,
  price_max        integer     NOT NULL DEFAULT 0,
  recurring_min    integer,
  recurring_max    integer,
  description      text,
  landing_path     text,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('draft','active','paused','retired')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_offers_lane_idx   ON marketing_offers(lane);
CREATE INDEX IF NOT EXISTS marketing_offers_status_idx ON marketing_offers(status);

-- Seed offers
INSERT INTO marketing_offers (name, slug, lane, price_min, price_max, recurring_min, recurring_max, description, landing_path, status)
VALUES
  ('Starter Contractor Site', 'starter-contractor-site', 'contractor', 1999, 1999, 199, 499,
   '8-page lead-generating website built in 2 weeks. Live preview before launch. Full ownership.',
   '/contractor-websites', 'active'),
  ('Starter + Client Portal', 'starter-plus-portal', 'contractor', 2498, 2498, 249, 499,
   '8-page site plus a client-facing portal for estimates, job status, and payment.',
   '/contractor-websites', 'active'),
  ('Free 10x Website Audit', 'free-10x-audit', 'contractor', 0, 0, NULL, NULL,
   'Free audit showing exactly what your current site is costing you in calls, leads, and trust.',
   '/start?offer=free-audit', 'active'),
  ('Website Refresh Sprint', 'website-refresh', 'contractor', 750, 2500, NULL, NULL,
   'Prioritized fixes and modern redesign for an existing weak site.',
   '/start?offer=website-refresh', 'active'),
  ('Medical Authority Site', 'medical-authority-site', 'medical', 3500, 15000, 299, 799,
   'Authority website with patient education, SEO content system, and referral pathway.',
   '/start?offer=medical-site', 'draft'),
  ('LMS White-Label Platform', 'lms-white-label', 'lms', 2500, 10000, 99, 499,
   'Branded language or training LMS platform powered by Language Threshold infrastructure.',
   '/start?offer=lms', 'draft'),
  ('Worker Bee OS White-Label', 'worker-bee-white-label-os', 'platform', 2499, 2499, 99, 499,
   'Full branded site-building operating system for agencies and consultants.',
   '/start?offer=wb-os', 'draft')
ON CONFLICT (slug) DO NOTHING;

-- Site inventory for marketing purposes
CREATE TABLE IF NOT EXISTS marketing_site_inventory (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          uuid,
  name             text        NOT NULL,
  repo_path        text,
  live_url         text,
  category         text        NOT NULL DEFAULT 'other'
                               CHECK (category IN (
                                 'contractor','medical','language_lms','climbing_content',
                                 'platform','other'
                               )),
  lane             text,
  proof_status     text        NOT NULL DEFAULT 'not_reviewed'
                               CHECK (proof_status IN (
                                 'not_reviewed','portfolio_ready','needs_polish',
                                 'live_client_proof','demo_spec_proof','campaign_active'
                               )),
  offer_id         uuid        REFERENCES marketing_offers(id) ON DELETE SET NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS msi_category_idx      ON marketing_site_inventory(category);
CREATE INDEX IF NOT EXISTS msi_proof_status_idx  ON marketing_site_inventory(proof_status);
CREATE INDEX IF NOT EXISTS msi_lane_idx          ON marketing_site_inventory(lane);

-- Seed June 6-7 contractor batch + key portfolio sites
INSERT INTO marketing_site_inventory (name, repo_path, live_url, category, lane, proof_status, notes)
VALUES
  -- June 6-7 contractor batch (demo/spec proof)
  ('Diffused Electrical Innovations', '/Users/drive/diffused-electrical-innovations', NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Electrical contractor — all images confirmed correct'),
  ('HB Saw Service',                  '/Users/drive/hb-saw-service',                  NULL, 'contractor', 'contractor', 'needs_polish',    'Saw sharpening / tree service — gallery image fixes pending'),
  ('Brux Fence and Design',           '/Users/drive/brux-fence-and-design',           NULL, 'contractor', 'contractor', 'needs_polish',    'Fence installer — image alignment fixes pending'),
  ('JS Painting Inc',                 '/Users/drive/js-painting-inc',                 NULL, 'contractor', 'contractor', 'needs_polish',    'Painting — 4 image mismatches identified'),
  ('TZ Painting LLC',                 '/Users/drive/tz-painting-llc',                 NULL, 'contractor', 'contractor', 'needs_polish',    'Painting — 2 image mismatches identified'),
  ('CO Landscaping',                  '/Users/drive/co-landscaping',                  NULL, 'contractor', 'contractor', 'needs_polish',    'Landscaping — 13 image mismatches identified'),
  ('CO Landscaping Sandpoint',        '/Users/drive/co-landscaping-sandpoint',        NULL, 'contractor', 'contractor', 'needs_polish',    'Landscaping — 6 image mismatches identified'),
  ('Gonzalez Painting & Drywall',     '/Users/drive/gonzalez-painting-drywall',       NULL, 'contractor', 'contractor', 'needs_polish',    'Painting/drywall — 7 gallery image mismatches'),
  ('Walker Appliance Rexburg',        '/Users/drive/walker-appliance-rexburg',        NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Appliance repair — wrong files unused, rendered images OK'),
  ('Lovells Tree Service',            '/Users/drive/lovells-tree-service',            NULL, 'contractor', 'contractor', 'portfolio_ready', 'Tree service — images audited and fixed Jun 7'),
  ('Kalisz Construction',             '/Users/drive/kalisz-construction',             NULL, 'contractor', 'contractor', 'demo_spec_proof', 'General construction — from June batch'),
  ('Allied Plumbing Meridian',        '/Users/drive/allied-plumbing-meridian',        NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Plumbing — Meridian, ID'),
  ('Broken Rail Fence',               '/Users/drive/broken-rail-fence',               NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Fence — from June batch'),
  ('BB Electric Boise',               '/Users/drive/bb-electric-boise',              NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Electrical — Boise, ID'),
  ('JL Anderson',                     '/Users/drive/jl-anderson',                     NULL, 'contractor', 'contractor', 'demo_spec_proof', 'General contractor — June batch'),
  ('Michaels HVAC CDA',               '/Users/drive/michaels-hvac-cda',              NULL, 'contractor', 'contractor', 'demo_spec_proof', 'HVAC — Coeur d''Alene, ID'),
  ('Behrend Plumbing',                '/Users/drive/behrend-plumbing',               NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Plumbing — June batch'),
  ('Precision Yardworks',             '/Users/drive/precision-yardworks',             NULL, 'contractor', 'contractor', 'demo_spec_proof', 'Landscaping — June batch'),
  ('Booth Construction',              '/Users/drive/booth-construction',              NULL, 'contractor', 'contractor', 'demo_spec_proof', 'General construction — June batch'),
  -- Medical / professional
  ('Orthobiologic Pathways',          '/Users/drive/orthobiologic-pathways',   'https://orthobiologicpathways.com',   'medical', 'medical', 'live_client_proof', 'Live — R3F + Framer Motion'),
  ('Toby Anderton MD',                '/Users/drive/tobyandertonmd',           'https://tobyandertonmd.vercel.app',   'medical', 'medical', 'portfolio_ready',   'Personal medical authority site'),
  -- Language / LMS
  ('Language Threshold',              '/Users/drive/language-threshold',       'https://languagethreshold.com',       'language_lms', 'lms', 'live_client_proof', 'Live — Spanish + Portuguese + Kiswahili'),
  ('Language Lens Elite',             '/Users/drive/language-lens-elite',      'https://language-lens-elite.worker-bee.app', 'language_lms', 'lms', 'live_client_proof', 'Live — CEFR games'),
  -- Climbing / content
  ('Climb France',                    '/Users/drive/climb-france',             'https://climb-france.vercel.app',    'climbing_content', NULL, 'portfolio_ready', 'Live'),
  ('Climb Brasil',                    '/Users/drive/climb-brasil',             'https://climbbrasil.com',            'climbing_content', NULL, 'portfolio_ready', 'Live'),
  -- Platform
  ('Manage Worker Bee',               '/Users/drive/manage-worker-bee',        'https://manage.worker-bee.app',      'platform', 'platform', 'live_client_proof', 'Internal OS — the system itself'),
  ('JRS Auto Repair',                 '/Users/drive/jrs-auto-repair',          'https://jrsautorepair.worker-bee.app','other',  NULL, 'live_client_proof', 'Live client site — Twin Falls')
ON CONFLICT DO NOTHING;
