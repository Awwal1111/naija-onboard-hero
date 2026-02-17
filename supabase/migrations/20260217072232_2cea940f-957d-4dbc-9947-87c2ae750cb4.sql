
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- CRON JOBS: The LinkedIn-style engagement engine
-- These were NEVER set up, which is why no automated emails sent
-- ============================================================

-- 1. DAILY EMAIL DIGEST - Every day at 7:00 AM WAT (6:00 UTC)
-- Like LinkedIn's "Here's what you missed" emails
SELECT cron.schedule(
  'daily-email-digest',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/send-daily-email-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 2. DAILY TELEGRAM DIGEST - Every day at 7:30 AM WAT (6:30 UTC)
SELECT cron.schedule(
  'daily-telegram-digest',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/telegram-daily-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3. WEEKLY DIGEST EMAIL - Every Monday at 8:00 AM WAT (7:00 UTC)
-- Like LinkedIn's "Weekly report"
SELECT cron.schedule(
  'weekly-email-digest',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/send-weekly-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 4. TELEGRAM WEEKLY SUMMARY - Every Monday at 8:30 AM WAT (7:30 UTC)
SELECT cron.schedule(
  'weekly-telegram-summary',
  '30 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/telegram-weekly-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 5. ENGAGEMENT EMAILS - Every day at 10:00 AM WAT (9:00 UTC)
-- Targets: incomplete profiles, inactive users, pending reviews
SELECT cron.schedule(
  'engagement-emails',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/send-engagement-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 6. AI-POWERED PROFILE COMPLETION NUDGE - Every Wednesday & Saturday at 11:00 AM WAT
-- Uses Gemini AI to write personalized messages
SELECT cron.schedule(
  'engage-incomplete-profiles',
  '0 10 * * 3,6',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/engage-incomplete-profiles',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 7. INACTIVE USER RE-ENGAGEMENT - Every Tuesday & Friday at 12:00 PM WAT
SELECT cron.schedule(
  'engage-inactive-users',
  '0 11 * * 2,5',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/engage-inactive-users',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 8. DAILY TELEGRAM REMINDERS - Every day at 6:00 PM WAT (5:00 PM UTC)
SELECT cron.schedule(
  'daily-telegram-reminders',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/daily-telegram-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
