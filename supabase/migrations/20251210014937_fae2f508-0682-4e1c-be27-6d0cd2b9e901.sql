-- Enable RLS on api_rate_limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rate limits (public info)
CREATE POLICY "Anyone can view rate limits" ON public.api_rate_limits
  FOR SELECT USING (true);