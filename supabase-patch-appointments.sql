-- ============================================================
-- SELORA — Patch: Appointments / Calendar table
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  call_log_id   UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  customer_name TEXT,
  customer_email TEXT,
  caller_number TEXT,
  service       TEXT,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  duration_mins INTEGER NOT NULL DEFAULT 60,
  status        TEXT NOT NULL DEFAULT 'confirmed',  -- pending|confirmed|completed|cancelled
  source        TEXT NOT NULL DEFAULT 'manual',     -- manual|retell|calcom|google|outlook
  external_id   TEXT,                               -- ID from external calendar system
  color         TEXT DEFAULT '#1D4ED8',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments: own rows only"
  ON public.appointments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id    ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_external   ON public.appointments(external_id);
