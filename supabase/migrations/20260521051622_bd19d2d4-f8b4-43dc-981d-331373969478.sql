
-- Usage counters for free-tier rate limiting
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_usage" ON public.usage_counters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_modify_usage" ON public.usage_counters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic increment with window reset. Returns new count.
CREATE OR REPLACE FUNCTION public.increment_usage(_key TEXT, _window_hours INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _new_count INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.usage_counters (user_id, key, count, window_start, updated_at)
  VALUES (_uid, _key, 1, now(), now())
  ON CONFLICT (user_id, key) DO UPDATE
    SET count = CASE
        WHEN public.usage_counters.window_start < now() - (_window_hours || ' hours')::interval
          THEN 1
        ELSE public.usage_counters.count + 1
      END,
      window_start = CASE
        WHEN public.usage_counters.window_start < now() - (_window_hours || ' hours')::interval
          THEN now()
        ELSE public.usage_counters.window_start
      END,
      updated_at = now()
  RETURNING count INTO _new_count;

  RETURN _new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage(TEXT, INTEGER) TO authenticated;
