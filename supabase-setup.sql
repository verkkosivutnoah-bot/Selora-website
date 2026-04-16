-- ============================================================
-- SELORA — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- ============================================================


-- ── 1. PROFILES TABLE ─────────────────────────────────────────────────────
-- One row per user. Linked to Supabase auth.users.
-- Auto-populated by the trigger below when a user signs up.

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  company_name    TEXT,
  phone           TEXT,
  has_active_plan BOOLEAN NOT NULL DEFAULT FALSE,
  plan_type       TEXT NOT NULL DEFAULT 'demo',  -- 'demo' | 'aloitus' | 'kasvu'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upgraded_at     TIMESTAMPTZ
);


-- ── 2. ONBOARDING TABLE ───────────────────────────────────────────────────
-- Stores the answers from the multi-step questionnaire.
-- One row per user (enforced by UNIQUE constraint for upsert support).

CREATE TABLE IF NOT EXISTS public.onboarding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name   TEXT,
  industry        TEXT,    -- e.g. 'parturi-kampaamo', 'ravintola', 'laakariasema'
  city            TEXT,
  services        TEXT,    -- free-text: what the business offers + prices
  hours           TEXT,    -- human-readable string: "Ma: 08:00–17:00, Ti: 08:00–17:00, ..."
  tasks           TEXT[],  -- ['answer_info', 'booking', 'pricing', ...]
  tone            TEXT,    -- 'professional' | 'friendly' | 'casual'
  language        TEXT,    -- comma-separated: 'fi' | 'fi,en' | 'fi,sv' | 'fi,sv,en'
  extra_info      TEXT,    -- free-text additional instructions
  completed_at    TIMESTAMPTZ,
  agent_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)          -- required for upsert({ onConflict: 'user_id' })
);


-- ── 3. RETELL AGENTS TABLE ────────────────────────────────────────────────
-- Stores the Retell AI agent created for each user.

CREATE TABLE IF NOT EXISTS public.retell_agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  onboarding_id    UUID REFERENCES public.onboarding(id),
  retell_agent_id  TEXT,           -- Agent ID returned by Retell API
  retell_llm_id    TEXT,           -- LLM ID returned by Retell API (v2 flow)
  retell_phone_num TEXT,           -- Phone number assigned by Retell
  agent_name       TEXT,
  system_prompt    TEXT,           -- The Claude-generated Finnish prompt
  voice_id         TEXT,           -- Retell voice ID, e.g. 'fi-FI-SelmaNeural'
  is_demo          BOOLEAN NOT NULL DEFAULT TRUE,
  demo_calls_used  INTEGER NOT NULL DEFAULT 0,
  demo_calls_limit INTEGER NOT NULL DEFAULT 5,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 4. CALL LOGS TABLE ────────────────────────────────────────────────────
-- Populated by create-web-call Edge Function + Retell AI webhooks.

CREATE TABLE IF NOT EXISTS public.call_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES public.retell_agents(id),  -- internal FK
  retell_call_id TEXT UNIQUE,      -- Retell's call ID (from webhook)
  call_type      TEXT,             -- 'web' | 'phone'
  caller_number  TEXT,
  duration_secs  INTEGER,
  outcome        TEXT,             -- 'completed' | 'voicemail' | 'transferred' | 'missed' | 'in_progress'
  summary        TEXT,             -- AI-generated call summary (from webhook)
  recording_url  TEXT,
  called_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Users can only read/write their own rows. Admins bypass via service role.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retell_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own row only"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- onboarding
CREATE POLICY "onboarding: own rows only"
  ON public.onboarding FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- retell_agents
CREATE POLICY "retell_agents: own rows only"
  ON public.retell_agents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- call_logs
CREATE POLICY "call_logs: own rows only"
  ON public.call_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-create profile row on new signup
-- Fires after a new row is inserted into auth.users
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
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
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ════════════════════════════════════════════════════════════════════════════
-- ADMIN FUNCTION: Upgrade a user's plan
-- Called by your admin Edge Function (service role key required — never expose
-- this key in the frontend).
-- Usage: SELECT upgrade_user_plan('user-uuid-here', 'aloitus');
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.upgrade_user_plan(
  target_user_id UUID,
  new_plan TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    has_active_plan = TRUE,
    plan_type       = new_plan,
    upgraded_at     = NOW()
  WHERE id = target_user_id;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES (for performance on larger datasets)
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id    ON public.onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_retell_agents_user_id ON public.retell_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id     ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_called_at   ON public.call_logs(called_at DESC);


-- ════════════════════════════════════════════════════════════════════════════
-- DONE — Next steps:
-- 1. In Supabase Dashboard → Authentication → Settings:
--    - Set Site URL to your domain (e.g. https://www.selora.fi)
--    - Add redirect URLs: https://www.selora.fi/dashboard.html
--    - Customize the confirmation email template (Emails tab)
-- 2. Deploy Edge Functions:
--    supabase link --project-ref zubhxdlssoochwbwyxlp
--    supabase functions deploy generate-demo-agent
--    supabase functions deploy create-web-call
-- 3. Set secrets:
--    supabase secrets set ANTHROPIC_API_KEY=sk-ant-... RETELL_API_KEY=key_...
-- ════════════════════════════════════════════════════════════════════════════
