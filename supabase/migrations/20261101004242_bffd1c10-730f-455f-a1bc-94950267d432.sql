CREATE OR REPLACE FUNCTION public.validate_developer_escrow_inspection_period()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_period_days < 1 OR NEW.inspection_period_days > 30 THEN
    RAISE EXCEPTION 'inspection_period_days must be between 1 and 30';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_developer_escrow_inspection_period ON public.developer_escrows;
CREATE TRIGGER trg_validate_developer_escrow_inspection_period
BEFORE INSERT OR UPDATE OF inspection_period_days ON public.developer_escrows
FOR EACH ROW
EXECUTE FUNCTION public.validate_developer_escrow_inspection_period();

REVOKE ALL ON FUNCTION public.validate_developer_escrow_inspection_period() FROM PUBLIC, anon, authenticated;