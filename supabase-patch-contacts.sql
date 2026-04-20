-- ============================================================
-- SELORA — Patch: Contacts / CRM table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           TEXT,
  phone_number   TEXT NOT NULL,
  email          TEXT,
  service_ordered TEXT,
  service_time   TIMESTAMPTZ,          -- next/last booked appointment time
  notes          TEXT,
  call_count     INTEGER NOT NULL DEFAULT 1,
  last_called_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts: own rows only"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id     ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone       ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_last_called ON public.contacts(last_called_at DESC);
