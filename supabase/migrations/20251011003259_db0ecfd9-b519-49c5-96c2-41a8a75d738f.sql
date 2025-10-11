-- Create articles tables if they don't exist

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  article_url text NOT NULL,
  submission_instructions text,
  reward_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  total_submissions integer NOT NULL DEFAULT 0,
  approved_submissions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.article_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  short_note text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for articles
CREATE POLICY "Anyone can view active articles"
  ON public.articles
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can view all articles"
  ON public.articles
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can create articles"
  ON public.articles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update articles"
  ON public.articles
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can delete articles"
  ON public.articles
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- RLS policies for article_submissions
CREATE POLICY "Users can view their own submissions"
  ON public.article_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.article_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Users can create their own submissions"
  ON public.article_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update submissions"
  ON public.article_submissions
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Create trigger to update article stats when submissions are approved
CREATE OR REPLACE FUNCTION update_article_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total submissions count
  UPDATE public.articles
  SET total_submissions = (
    SELECT COUNT(*) FROM public.article_submissions 
    WHERE article_id = NEW.article_id
  ),
  approved_submissions = (
    SELECT COUNT(*) FROM public.article_submissions 
    WHERE article_id = NEW.article_id AND status = 'approved'
  )
  WHERE id = NEW.article_id;
  
  -- If approved, credit user wallet
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get article reward amount
    DECLARE
      article_reward numeric;
    BEGIN
      SELECT reward_amount INTO article_reward 
      FROM public.articles 
      WHERE id = NEW.article_id;
      
      -- Credit user wallet
      UPDATE public.profiles 
      SET 
        wallet_balance = wallet_balance + article_reward,
        balance_withdrawable = balance_withdrawable + article_reward
      WHERE user_id = NEW.user_id;
      
      -- Create transaction record
      INSERT INTO public.wallet_transactions (user_id, amount, kind, status, reference)
      VALUES (
        NEW.user_id,
        article_reward,
        'article_reward',
        'completed',
        'Article reading reward'
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER article_submission_stats_trigger
  AFTER INSERT OR UPDATE ON public.article_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_article_stats();

-- Grant necessary permissions
GRANT ALL ON public.articles TO authenticated;
GRANT ALL ON public.article_submissions TO authenticated;