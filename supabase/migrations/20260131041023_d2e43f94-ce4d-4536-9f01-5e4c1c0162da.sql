-- Add SMS job alerts opt-in column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_job_alerts BOOLEAN DEFAULT false;