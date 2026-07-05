-- Migration: 20260702_add_invoices
-- Adds public_token column to invoices table for client-facing portal access.
-- Core invoices/invoice_items tables already exist (20260524000001_monetization.sql).

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Allow anonymous access to invoices by public_token (for client portal)
-- Service role already has full access via existing policy.
-- Public reads via matching public_token only — no RLS bypass needed for anon reads
-- because we use the service role on the server with an explicit .eq('public_token', token) filter.

-- Index for fast portal lookups
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

-- Backfill public_token for any existing rows that got NULL (shouldn't happen with DEFAULT, but just in case)
UPDATE invoices SET public_token = gen_random_uuid() WHERE public_token IS NULL;
