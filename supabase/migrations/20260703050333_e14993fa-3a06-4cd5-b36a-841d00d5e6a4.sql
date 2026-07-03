ALTER TABLE public.job_post_applications
  ADD COLUMN IF NOT EXISTS proposed_contract_type text CHECK (proposed_contract_type IN ('fixed','hourly','milestone')),
  ADD COLUMN IF NOT EXISTS proposed_rate numeric,
  ADD COLUMN IF NOT EXISTS proposed_duration_days integer;