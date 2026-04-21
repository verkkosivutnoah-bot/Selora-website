-- ============================================================
-- SELORA — Newsletter subscribers table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',        -- active | unsubscribed
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  source          TEXT DEFAULT 'blogi',
  unsub_token     TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex')
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Only service role can read (no public access)
DROP POLICY IF EXISTS "newsletter: service role only" ON public.newsletter_subscribers;
CREATE POLICY "newsletter: service role only"
  ON public.newsletter_subscribers FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_newsletter_email  ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON public.newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_token  ON public.newsletter_subscribers(unsub_token);
