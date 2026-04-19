-- ============================================================
-- SELORA — Patch: Add transcript + sentiment + action_items
-- Run in Supabase SQL Editor
-- ============================================================

-- Add transcript column (full call transcript from Retell)
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS transcript   TEXT,
  ADD COLUMN IF NOT EXISTS sentiment    TEXT,       -- 'positive' | 'neutral' | 'negative'
  ADD COLUMN IF NOT EXISTS action_items TEXT[];     -- extracted action items from summary

-- Make sure retell_call_id has a UNIQUE constraint for upserts
-- (it may already be UNIQUE from the original schema — IF NOT EXISTS handles that)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'call_logs_retell_call_id_key'
  ) THEN
    ALTER TABLE public.call_logs
      ADD CONSTRAINT call_logs_retell_call_id_key UNIQUE (retell_call_id);
  END IF;
END $$;

-- Index for faster sentiment/outcome filtering in dashboard
CREATE INDEX IF NOT EXISTS idx_call_logs_sentiment ON public.call_logs(sentiment);
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome   ON public.call_logs(outcome);
