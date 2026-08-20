-- Stage 10: social intelligence
--
-- Three tables behind the social-ideas workflow. The agent's job there is to
-- propose what to post next, and a proposal is only worth reading if it was
-- made while looking at what already worked — so the numbers land here first,
-- and the ideas that come out carry a reference back to the posts that
-- justified them.
--
--   social_tokens  OAuth credentials for Instagram and TikTok
--   social_posts   one row per published post, with its metrics
--   social_ideas   one row per proposed hook, with its evidence
--
-- Run once in the Supabase SQL editor, after supabase-patch-agent.sql.


-- ── 1. TOKENS ─────────────────────────────────────────────────────────────
-- Not in GitHub secrets, and that is the whole point. TikTok rotates the
-- refresh token on every exchange, so whatever holds it has to be writable by
-- the process doing the refresh. A secret is not.
--
-- Instagram's long-lived token lasts 60 days and is refreshed in place;
-- TikTok's access token lasts 24 hours and its refresh token a year. The
-- runner refreshes whichever has expired and writes the result straight back
-- here, so a scheduled job that runs weekly never finds a dead credential.
--
-- RLS is enabled with no policy at all. That is not an oversight: the only
-- thing that should ever read this table is the service role, which bypasses
-- RLS. The dashboard has no reason to see an access token and the browser has
-- no reason to hold one.

CREATE TABLE IF NOT EXISTS public.social_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,          -- 'instagram' | 'tiktok'
  account_id     TEXT,                   -- IG user id / TikTok open_id
  handle         TEXT,                   -- for display in the dashboard
  access_token   TEXT NOT NULL,
  refresh_token  TEXT,                   -- TikTok only; Instagram refreshes in place
  expires_at     TIMESTAMPTZ,
  refreshed_at   TIMESTAMPTZ,
  last_error     TEXT,                   -- why the last refresh or fetch failed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.social_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally no policy. Service role only.


-- ── 2. POSTS ──────────────────────────────────────────────────────────────
-- What was published, and how it did. Refetched on every run rather than
-- written once, because a reel keeps accumulating views for weeks and an
-- analysis built on day-one numbers ranks the newest post last every time.
--
-- `metrics` is JSONB because the two platforms do not agree on what a number
-- is: Instagram reports saves and reach, TikTok reports neither. Normalising
-- them into shared columns would mean inventing values for whichever platform
-- does not report them, so the raw shape is kept and the digest does the
-- comparing.

CREATE TABLE IF NOT EXISTS public.social_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,          -- 'instagram' | 'tiktok'
  external_id    TEXT NOT NULL,          -- media id / video id on the platform
  permalink      TEXT,
  media_type     TEXT,                   -- 'reel' | 'video' | 'image' | 'carousel'
  caption        TEXT,
  posted_at      TIMESTAMPTZ,
  duration_secs  NUMERIC,                -- video length, when the platform says
  metrics        JSONB NOT NULL DEFAULT '{}'::jsonb,
                 -- views, likes, comments, shares, saves, reach,
                 -- avg_watch_secs — whichever the platform actually returned
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user
  ON public.social_posts (user_id, posted_at DESC);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Read-only to the client. Rows come from the platforms via the runner; a
-- dashboard that could edit them would be editing history.
DROP POLICY IF EXISTS "own social posts" ON public.social_posts;
CREATE POLICY "own social posts" ON public.social_posts
  FOR SELECT USING (auth.uid() = user_id);


-- ── 3. IDEAS ──────────────────────────────────────────────────────────────
-- What to post next. One row per hook, not per finished post: the agent
-- proposes the opening line and the angle, and the video is still yours to
-- make.
--
-- `evidence` is what separates this from a list of generic content prompts.
-- It holds the external_ids of the posts the idea was drawn from, so every
-- suggestion can be traced back to numbers rather than to the model's taste.

CREATE TABLE IF NOT EXISTS public.social_ideas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id       UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  platform     TEXT NOT NULL DEFAULT 'both',   -- 'instagram' | 'tiktok' | 'both'
  hook         TEXT NOT NULL,          -- the first line, written to be said aloud
  angle        TEXT NOT NULL,          -- what the post is actually about
  format       TEXT,                   -- 'talking head' | 'screen recording' | ...
  rationale    TEXT,                   -- which pattern in the data this leans on
  evidence     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- external_ids it came from
  status       TEXT NOT NULL DEFAULT 'new',          -- 'new' | 'used' | 'discarded'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_ideas_user
  ON public.social_ideas (user_id, created_at DESC);

ALTER TABLE public.social_ideas ENABLE ROW LEVEL SECURITY;

-- Writable, unlike posts: marking an idea used or discarded is bookkeeping,
-- and it queues no work.
DROP POLICY IF EXISTS "own social ideas" ON public.social_ideas;
CREATE POLICY "own social ideas" ON public.social_ideas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
