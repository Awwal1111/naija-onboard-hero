
-- Anti-spam trigger for posts
CREATE OR REPLACE FUNCTION public.detect_post_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_combined text;
  v_recent_count int;
  v_dup_count int;
  v_link_count int;
BEGIN
  -- Skip system/admin posts
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_combined := lower(coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));

  -- 1. Minimum length (unless media attached)
  IF length(trim(coalesce(NEW.content, ''))) < 10
     AND (NEW.media_urls IS NULL OR array_length(NEW.media_urls, 1) IS NULL) THEN
    RAISE EXCEPTION 'POST_SPAM_BLOCKED: Your post is too short. Please write something meaningful (at least 10 characters) or add media.'
      USING HINT = 'Add more detail or attach an image/video.';
  END IF;

  -- 2. Promotional / scam patterns
  IF v_combined ~* '\m(download (this |the |our )?(app|game)|sign ?up (and|to) (earn|get)|earn \$?\d+|play to earn|refer(ral)? code|use my (code|link)|join my team|click (the )?link|register (now|here|today) and (earn|get)|free money|get rich|guaranteed (income|profit))\M' THEN
    RAISE EXCEPTION 'POST_SPAM_BLOCKED: Promotional / referral / "earn money" content is not allowed.'
      USING HINT = 'Share useful, professional content. Promotional posts will be blocked.';
  END IF;

  -- 3. External contact harvesting (WhatsApp/Telegram + phone number)
  IF v_combined ~* '\m(whatsapp|telegram|wa\.me|t\.me|chat me on|dm me on)\M' AND v_combined ~ '\d{7,}' THEN
    RAISE EXCEPTION 'POST_SPAM_BLOCKED: Sharing WhatsApp / Telegram numbers in posts is not allowed.'
      USING HINT = 'Use the in-app chat. Numbers in posts attract scammers.';
  END IF;

  -- 4. Excessive links (more than 2 distinct URLs)
  v_link_count := (length(v_combined) - length(regexp_replace(v_combined, 'https?://', '', 'g'))) / 8;
  IF v_link_count > 2 THEN
    RAISE EXCEPTION 'POST_SPAM_BLOCKED: Too many links in one post (max 2).'
      USING HINT = 'Posts with many links are usually spam.';
  END IF;

  -- 5. Rate limit: max 6 posts per hour
  SELECT count(*) INTO v_recent_count
    FROM public.posts
   WHERE user_id = NEW.user_id
     AND created_at > now() - interval '1 hour';
  IF v_recent_count >= 6 THEN
    RAISE EXCEPTION 'POST_SPAM_BLOCKED: You are posting too quickly (max 6 per hour).'
      USING HINT = 'Take a break and post again later.';
  END IF;

  -- 6. Duplicate content within 24h (same content text)
  IF length(trim(coalesce(NEW.content, ''))) > 20 THEN
    SELECT count(*) INTO v_dup_count
      FROM public.posts
     WHERE user_id = NEW.user_id
       AND lower(trim(content)) = lower(trim(NEW.content))
       AND created_at > now() - interval '24 hours';
    IF v_dup_count > 0 THEN
      RAISE EXCEPTION 'POST_SPAM_BLOCKED: You already posted this content recently.'
        USING HINT = 'Please write something new instead of reposting the same text.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_post_spam ON public.posts;
CREATE TRIGGER trg_detect_post_spam
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_post_spam();

CREATE INDEX IF NOT EXISTS idx_posts_user_created_at
  ON public.posts (user_id, created_at DESC);
