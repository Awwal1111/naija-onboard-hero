CREATE TABLE public.payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_user_id uuid NOT NULL,
  short_code text NOT NULL UNIQUE,
  amount numeric,
  note text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  paid_by_user_id uuid,
  paid_at timestamptz,
  paid_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_requests_creator ON public.payment_requests(creator_user_id);
CREATE INDEX idx_payment_requests_short_code ON public.payment_requests(short_code);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view payment requests by short code"
  ON public.payment_requests FOR SELECT
  USING (true);

CREATE POLICY "Users create their own payment requests"
  ON public.payment_requests FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Creators update their own payment requests"
  ON public.payment_requests FOR UPDATE
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Creators delete their own payment requests"
  ON public.payment_requests FOR DELETE
  USING (auth.uid() = creator_user_id);

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();