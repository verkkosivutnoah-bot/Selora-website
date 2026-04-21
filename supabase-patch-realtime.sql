-- Enable Supabase Realtime for live dashboard updates
-- Run this once in the Supabase SQL editor.
-- This allows the dashboard to receive instant push notifications
-- when call_logs, appointments, and contacts rows are inserted/updated/deleted.

ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
