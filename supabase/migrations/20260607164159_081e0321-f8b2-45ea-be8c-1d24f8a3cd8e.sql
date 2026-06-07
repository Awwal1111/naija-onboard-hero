CREATE OR REPLACE FUNCTION util.invoke_send_weekly_digest()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  auth_token text;
  req_id bigint;
begin
  -- Read decrypted secret; tolerate missing/null without failing the cron run
  select decrypted_secret into auth_token
  from vault.decrypted_secrets
  where name = 'weekly_digest_auth'
  limit 1;

  if auth_token is null or length(trim(auth_token)) = 0 then
    raise warning 'weekly_digest_auth vault secret missing; skipping send-weekly-digest invocation';
    return null;
  end if;

  req_id := net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_token
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 5000
  );

  return req_id;
end;
$function$;