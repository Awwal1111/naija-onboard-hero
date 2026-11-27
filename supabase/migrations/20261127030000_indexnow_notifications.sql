-- IndexNow notifications for public NaijaLancers content.
-- The shared webhook secret is stored separately in Supabase Vault, never in source control.

create or replace function public.notify_indexnow_on_content_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
  event_payload jsonb;
begin
  select decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets
   where name = 'indexnow_webhook_secret'
   limit 1;

  -- Keep normal content writes working if the secret has not yet been configured.
  if webhook_secret is null or webhook_secret = '' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  event_payload := jsonb_build_object(
    'type', tg_op,
    'schema', tg_table_schema,
    'table', tg_table_name,
    'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );

  perform net.http_post(
    url := 'https://www.naijalancers.name.ng/api/indexnow',
    body := event_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-indexnow-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.notify_indexnow_on_content_change() from public, anon, authenticated;

drop trigger if exists indexnow_profiles_insert_delete on public.profiles;
create trigger indexnow_profiles_insert_delete
after insert or delete on public.profiles
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_profiles_update on public.profiles;
create trigger indexnow_profiles_update
after update of username, is_expert, full_name, bio, profession, profile_picture_url, country_code, state_name
on public.profiles
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_gigs_insert_delete on public.jobs_services;
create trigger indexnow_gigs_insert_delete
after insert or delete on public.jobs_services
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_gigs_update on public.jobs_services;
create trigger indexnow_gigs_update
after update of status, title, description, category, price, photo_urls
on public.jobs_services
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_jobs_insert_delete on public.job_posts;
create trigger indexnow_jobs_insert_delete
after insert or delete on public.job_posts
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_jobs_update on public.job_posts;
create trigger indexnow_jobs_update
after update of status, title, description, company_name, location, job_type, required_skills
on public.job_posts
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_courses_insert_delete on public.courses;
create trigger indexnow_courses_insert_delete
after insert or delete on public.courses
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_courses_update on public.courses;
create trigger indexnow_courses_update
after update of status, title, description, thumbnail_url
on public.courses
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_fundraisings_insert_delete on public.fundraisings;
create trigger indexnow_fundraisings_insert_delete
after insert or delete on public.fundraisings
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_fundraisings_update on public.fundraisings;
create trigger indexnow_fundraisings_update
after update of status, title, description, featured_image_url
on public.fundraisings
for each row execute function public.notify_indexnow_on_content_change();
