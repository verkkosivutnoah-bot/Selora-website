-- Stage 9: scheduled agent
--
-- Adds the two tables behind agentti.html: `agent_jobs` holds the definition
-- of a recurring piece of work, `agent_runs` holds one row per execution.
--
-- The scheduler is deliberately not a cron expression. The dashboard needs to
-- render and edit the schedule, and "08:30 on weekdays" covers what this is
-- for; a cron string would be harder to show in a UI and harder to validate.
-- A job therefore stores a local time of day plus the weekdays it runs on, and
-- `enqueue_due_agent_runs()` (below) resolves that against the job's timezone.
--
-- Run once in the Supabase SQL editor, after supabase-setup.sql.


-- ── EXTENSIONS ────────────────────────────────────────────────────────────
-- pg_cron ticks the scheduler; pg_net lets that tick reach the edge function
-- without a round trip through the client.

-- Both hardcode their own schema (`cron`, `net`), so no WITH SCHEMA clause.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ── 1. AGENT JOBS ─────────────────────────────────────────────────────────
-- One row per thing the agent does on a schedule.
--
-- `workflow` is a slug that must match a file at agent/workflows/<slug>.md in
-- the repository. The runner reads that file and hands it to Claude as the
-- prompt, so adding a workflow is adding a markdown file — no schema change.

CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  workflow      TEXT NOT NULL,
  notes         TEXT,              -- free-text appended to the workflow prompt
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Schedule. All three are NULL for a manual-only job.
  run_at_time   TIME,              -- local wall-clock time, e.g. '08:30'
  run_on_days   SMALLINT[],        -- ISO weekdays, 1 = Monday .. 7 = Sunday
  timezone      TEXT NOT NULL DEFAULT 'Europe/Helsinki',

  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_user ON public.agent_jobs (user_id);

-- The scheduler scans this every minute, so keep the candidate set small.
CREATE INDEX IF NOT EXISTS idx_agent_jobs_due
  ON public.agent_jobs (run_at_time)
  WHERE enabled AND run_at_time IS NOT NULL;


-- ── 2. AGENT RUNS ─────────────────────────────────────────────────────────
-- One row per execution. Created queued, advanced by the GitHub Actions
-- runner as it works.

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'queued',
                 -- 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
  trigger        TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'schedule'
  output         TEXT,             -- what the agent reported back
  error          TEXT,
  github_run_url TEXT,             -- deep link to the Actions run, for debugging
  duration_secs  INTEGER,
  queued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_job
  ON public.agent_runs (job_id, queued_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user
  ON public.agent_runs (user_id, queued_at DESC);


-- ── 3. ROW LEVEL SECURITY ─────────────────────────────────────────────────
-- Same shape as the rest of the schema: a user sees only their own rows. The
-- runner and the scheduler both use the service role, which bypasses these.

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own agent jobs" ON public.agent_jobs;
CREATE POLICY "own agent jobs" ON public.agent_jobs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Runs are read-only to the client. Creating one goes through the edge
-- function, so the dashboard cannot queue work that never gets dispatched.
DROP POLICY IF EXISTS "own agent runs" ON public.agent_runs;
CREATE POLICY "own agent runs" ON public.agent_runs
  FOR SELECT USING (auth.uid() = user_id);


-- ── 4. KEEP updated_at HONEST ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_agent_job()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_agent_job ON public.agent_jobs;
CREATE TRIGGER trg_touch_agent_job
  BEFORE UPDATE ON public.agent_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_job();


-- ── 5. THE SCHEDULER ──────────────────────────────────────────────────────
-- Runs every minute. For each enabled job, converts NOW() into the job's own
-- timezone and asks three questions: is today one of its weekdays, has its
-- time of day passed, and has it already run since local midnight. Only a job
-- that answers yes/yes/no gets queued.
--
-- Comparing against local midnight rather than "was the last run 24h ago" is
-- what makes this survive a missed tick: if the database was down at 08:30 the
-- job still fires at 08:31, but it fires once, not once per minute after.
--
-- Requires two settings to reach the edge function. Set them once as the
-- postgres superuser:
--
--   ALTER DATABASE postgres SET app.supabase_url        = 'https://zubhxdlssoochwbwyxlp.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key    = '<service role key>';

CREATE OR REPLACE FUNCTION public.enqueue_due_agent_runs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, cron
AS $$
DECLARE
  job         RECORD;
  local_now   TIMESTAMP;
  queued      INTEGER := 0;
  fn_url      TEXT := current_setting('app.supabase_url',     TRUE);
  service_key TEXT := current_setting('app.service_role_key', TRUE);
BEGIN
  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'enqueue_due_agent_runs: app.supabase_url / app.service_role_key not set, skipping';
    RETURN 0;
  END IF;

  FOR job IN
    SELECT * FROM public.agent_jobs
    WHERE enabled
      AND run_at_time IS NOT NULL
      AND run_on_days IS NOT NULL
  LOOP
    local_now := NOW() AT TIME ZONE job.timezone;

    CONTINUE WHEN NOT (EXTRACT(ISODOW FROM local_now)::SMALLINT = ANY (job.run_on_days));
    CONTINUE WHEN local_now::TIME < job.run_at_time;

    -- Already ran today, in the job's own timezone.
    CONTINUE WHEN job.last_run_at IS NOT NULL
             AND (job.last_run_at AT TIME ZONE job.timezone)::DATE = local_now::DATE;

    -- Claim it before dispatching. If the HTTP call below fails the job is
    -- still marked as run for today, which is the safe direction to fail:
    -- a skipped run beats an unbounded retry loop firing every minute.
    UPDATE public.agent_jobs SET last_run_at = NOW() WHERE id = job.id;

    PERFORM net.http_post(
      url     := fn_url || '/functions/v1/dispatch-agent-job',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || service_key
                 ),
      body    := jsonb_build_object('job_id', job.id, 'trigger', 'schedule')
    );

    queued := queued + 1;
  END LOOP;

  RETURN queued;
END;
$$;

-- Tick once a minute. Unschedule first so re-running this file is safe.
SELECT cron.unschedule('agent-scheduler')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agent-scheduler');

SELECT cron.schedule(
  'agent-scheduler',
  '* * * * *',
  $$SELECT public.enqueue_due_agent_runs()$$
);
