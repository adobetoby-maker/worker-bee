-- Client intake submissions — stores everything collected from the HTML intake form
CREATE TABLE client_intake (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid REFERENCES sites(id) ON DELETE CASCADE,
  token         text UNIQUE NOT NULL,               -- matches share_tokens.token
  status        text NOT NULL DEFAULT 'pending',    -- pending | reviewed | deployed
  
  -- Company identity
  company_name  text,
  legal_name    text,
  tagline       text,
  
  -- Contact
  phone         text,
  phone2        text,
  email         text,
  website       text,
  
  -- Address
  address       text,
  city          text,
  state         text,
  zip           text,
  
  -- Brand
  primary_color text,
  logo_url      text,      -- stored in Supabase Storage after upload
  
  -- Services & area
  services      jsonb,     -- array of service names
  service_area  jsonb,     -- array of cities
  
  -- Hours
  hours         jsonb,     -- { mon: "8am-5pm", ... }
  
  -- Social
  facebook_url  text,
  google_maps_url text,
  yelp_url      text,
  
  -- Photos (up to 10)
  photo_urls    jsonb,     -- array of Supabase Storage URLs
  
  -- Free-form notes from client
  notes         text,
  
  -- Meta
  submitted_at  timestamptz DEFAULT now(),
  reviewed_at   timestamptz,
  deployed_at   timestamptz,
  deployed_url  text
);

-- No RLS — intake submissions are public (token-gated) on write, admin-only on read
ALTER TABLE client_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_submit_intake" ON client_intake
  FOR INSERT WITH CHECK (true);  -- anyone with the token can submit

CREATE POLICY "admins_read_intake" ON client_intake
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admins_update_intake" ON client_intake
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
