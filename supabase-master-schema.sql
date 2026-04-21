-- ============================================================
-- SELORA — Master Schema (idempotent, safe to re-run)
-- Run this entire file in Supabase SQL Editor to ensure
-- all tables, columns, policies, and indexes exist.
-- ============================================================


-- ── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  company_name    TEXT,
  phone           TEXT,
  has_active_plan BOOLEAN NOT NULL DEFAULT FALSE,
  plan_type       TEXT NOT NULL DEFAULT 'demo',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upgraded_at     TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles: own row only" ON public.profiles;
CREATE POLICY "profiles: own row only"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── 2. ONBOARDING ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name   TEXT,
  industry        TEXT,
  city            TEXT,
  services        TEXT,
  hours           TEXT,
  tasks           TEXT[],
  tone            TEXT,
  language        TEXT,
  extra_info      TEXT,
  completed_at    TIMESTAMPTZ,
  agent_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding: own rows only" ON public.onboarding;
CREATE POLICY "onboarding: own rows only"
  ON public.onboarding FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding(user_id);


-- ── 3. RETELL AGENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retell_agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  onboarding_id    UUID REFERENCES public.onboarding(id),
  retell_agent_id  TEXT,
  retell_llm_id    TEXT,
  retell_phone_num TEXT,
  agent_name       TEXT,
  system_prompt    TEXT,
  voice_id         TEXT,
  begin_message    TEXT,
  is_demo          BOOLEAN NOT NULL DEFAULT TRUE,
  demo_calls_used  INTEGER NOT NULL DEFAULT 0,
  demo_calls_limit INTEGER NOT NULL DEFAULT 5,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add begin_message if it doesn't exist yet
ALTER TABLE public.retell_agents ADD COLUMN IF NOT EXISTS begin_message TEXT;

ALTER TABLE public.retell_agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "retell_agents: own rows only" ON public.retell_agents;
CREATE POLICY "retell_agents: own rows only"
  ON public.retell_agents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_retell_agents_user_id ON public.retell_agents(user_id);


-- ── 4. CALL LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES public.retell_agents(id),
  retell_call_id TEXT,
  call_type      TEXT,
  caller_number  TEXT,
  duration_secs  INTEGER,
  outcome        TEXT,
  summary        TEXT,
  recording_url  TEXT,
  called_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Extended columns (patch-transcripts)
  transcript     TEXT,
  sentiment      TEXT,
  action_items   TEXT[]
);

-- Add all extended columns safely
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS transcript    TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS sentiment     TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS action_items  TEXT[];
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS retell_call_id TEXT;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_type     TEXT;

-- Ensure unique constraint on retell_call_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'call_logs_retell_call_id_key'
  ) THEN
    ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_retell_call_id_key UNIQUE (retell_call_id);
  END IF;
END $$;

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "call_logs: own rows only" ON public.call_logs;
CREATE POLICY "call_logs: own rows only"
  ON public.call_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id   ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_called_at ON public.call_logs(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_sentiment ON public.call_logs(sentiment);
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome   ON public.call_logs(outcome);


-- ── 5. CONTACTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT,
  phone_number    TEXT NOT NULL,
  email           TEXT,
  service_ordered TEXT,
  service_time    TIMESTAMPTZ,
  notes           TEXT,
  call_count      INTEGER NOT NULL DEFAULT 1,
  last_called_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contacts: own rows only" ON public.contacts;
CREATE POLICY "contacts: own rows only"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id     ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone       ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_last_called ON public.contacts(last_called_at DESC);


-- ── 6. APPOINTMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id     UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  call_log_id    UUID REFERENCES public.call_logs(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  customer_name  TEXT,
  customer_email TEXT,
  caller_number  TEXT,
  service        TEXT,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ,
  duration_mins  INTEGER NOT NULL DEFAULT 60,
  status         TEXT NOT NULL DEFAULT 'pending',
  source         TEXT NOT NULL DEFAULT 'manual',
  external_id    TEXT,
  color          TEXT DEFAULT '#1D4ED8',
  type           TEXT NOT NULL DEFAULT 'appointment',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add type column if it doesn't exist
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'appointment';

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments: own rows only" ON public.appointments;
CREATE POLICY "appointments: own rows only"
  ON public.appointments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id    ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_type       ON public.appointments(type);


-- ── 7. REALTIME ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;


-- ── 8. NEW-USER TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 9. ADMIN FUNCTION ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  target_user_id UUID,
  new_plan TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET has_active_plan = TRUE,
      plan_type       = new_plan,
      upgraded_at     = NOW()
  WHERE id = target_user_id;
END;
$$;
