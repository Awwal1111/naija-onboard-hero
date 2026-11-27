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

  -- Send only the identifiers and publication fields needed to derive a URL.
  -- Never forward full profile, wallet, contact, or listing records to the webhook.
  if tg_op <> 'DELETE' then
    if tg_table_name = 'profiles' then
      event_payload := jsonb_build_object(
        'record', jsonb_build_object(
          'user_id', to_jsonb(new)->'user_id',
          'username', to_jsonb(new)->'username',
          'is_expert', to_jsonb(new)->'is_expert'
        )
      );
    else
      event_payload := jsonb_build_object(
        'record', jsonb_build_object(
          'id', to_jsonb(new)->'id',
          'status', to_jsonb(new)->'status'
        )
      );
    end if;
  else
    event_payload := jsonb_build_object('record', null);
  end if;

  if tg_op <> 'INSERT' then
    if tg_table_name = 'profiles' then
      event_payload := event_payload || jsonb_build_object(
        'old_record', jsonb_build_object(
          'user_id', to_jsonb(old)->'user_id',
          'username', to_jsonb(old)->'username',
          'is_expert', to_jsonb(old)->'is_expert'
        )
      );
    else
      event_payload := event_payload || jsonb_build_object(
        'old_record', jsonb_build_object(
          'id', to_jsonb(old)->'id',
          'status', to_jsonb(old)->'status'
        )
      );
    end if;
  else
    event_payload := event_payload || jsonb_build_object('old_record', null);
  end if;

  event_payload := event_payload || jsonb_build_object(
    'type', tg_op,
    'schema', tg_table_schema,
    'table', tg_table_name
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
for each row
when (
  old.username is distinct from new.username or
  old.is_expert is distinct from new.is_expert or
  old.full_name is distinct from new.full_name or
  old.bio is distinct from new.bio or
  old.profession is distinct from new.profession or
  old.profile_picture_url is distinct from new.profile_picture_url or
  old.country_code is distinct from new.country_code or
  old.state_name is distinct from new.state_name
)
execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_profiles_update on public.profiles;
create trigger indexnow_profiles_update
after update of username, is_expert, full_name, bio, profession, profile_picture_url, country_code, state_name
on public.profiles
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_gigs_insert_delete on public.jobs_services;
create trigger indexnow_gigs_insert_delete
after insert or delete on public.jobs_services
for each row
when (
  old.status is distinct from new.status or
  old.title is distinct from new.title or
  old.description is distinct from new.description or
  old.category is distinct from new.category or
  old.price is distinct from new.price or
  old.photo_urls is distinct from new.photo_urls
)
execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_gigs_update on public.jobs_services;
create trigger indexnow_gigs_update
after update of status, title, description, category, price, photo_urls
on public.jobs_services
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_jobs_insert_delete on public.job_posts;
create trigger indexnow_jobs_insert_delete
after insert or delete on public.job_posts
for each row
when (
  old.status is distinct from new.status or
  old.title is distinct from new.title or
  old.description is distinct from new.description or
  old.company_name is distinct from new.company_name or
  old.location is distinct from new.location or
  old.job_type is distinct from new.job_type or
  old.required_skills is distinct from new.required_skills
)
execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_jobs_update on public.job_posts;
create trigger indexnow_jobs_update
after update of status, title, description, company_name, location, job_type, required_skills
on public.job_posts
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_courses_insert_delete on public.courses;
create trigger indexnow_courses_insert_delete
after insert or delete on public.courses
for each row
when (
  old.status is distinct from new.status or
  old.title is distinct from new.title or
  old.description is distinct from new.description or
  old.thumbnail_url is distinct from new.thumbnail_url
)
execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_courses_update on public.courses;
create trigger indexnow_courses_update
after update of status, title, description, thumbnail_url
on public.courses
for each row execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_fundraisings_insert_delete on public.fundraisings;
create trigger indexnow_fundraisings_insert_delete
after insert or delete on public.fundraisings
for each row
when (
  old.status is distinct from new.status or
  old.title is distinct from new.title or
  old.description is distinct from new.description or
  old.featured_image_url is distinct from new.featured_image_url
)
execute function public.notify_indexnow_on_content_change();

drop trigger if exists indexnow_fundraisings_update on public.fundraisings;
create trigger indexnow_fundraisings_update
after update of status, title, description, featured_image_url
on public.fundraisings
for each row execute function public.notify_indexnow_on_content_change();
