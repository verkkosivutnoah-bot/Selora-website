-- Stage 7: push notifications
--
-- Adds the columns required by send-push-notification + daily-summary
-- edge functions and the mobile app's push registration flow.
--
-- Run once in the Supabase SQL editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB
  DEFAULT '{"new_calls":true,"bookings":true,"daily_summary":true}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token
  ON public.profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;
