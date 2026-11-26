-- Persist channel choices and legally relevant signup consent.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  telegram_enabled boolean not null default false,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  marketing_updates_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read their notification preferences" on public.notification_preferences;
create policy "Users can read their notification preferences"
  on public.notification_preferences for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert their notification preferences" on public.notification_preferences;
create policy "Users can insert their notification preferences"
  on public.notification_preferences for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their notification preferences" on public.notification_preferences;
create policy "Users can update their notification preferences"
  on public.notification_preferences for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.signup_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null,
  terms_version text not null,
  privacy_version text not null,
  telegram_notifications_opt_in boolean not null default false,
  marketing_updates_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.signup_consents enable row level security;

drop policy if exists "Users can read their signup consents" on public.signup_consents;
create policy "Users can read their signup consents"
  on public.signup_consents for select
  to authenticated using (auth.uid() = user_id);

create or replace function public.initialize_user_notification_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_at_value timestamptz;
  telegram_opt_in boolean := coalesce((new.raw_user_meta_data ->> 'telegram_notifications_opt_in')::boolean, false);
  marketing_opt_in boolean := coalesce((new.raw_user_meta_data ->> 'marketing_updates_opt_in')::boolean, false);
begin
  begin
    accepted_at_value := (new.raw_user_meta_data ->> 'accepted_terms_at')::timestamptz;
  exception when others then
    accepted_at_value := null;
  end;

  insert into public.notification_preferences (
    user_id, in_app_enabled, email_enabled, telegram_enabled,
    push_enabled, sms_enabled, marketing_updates_enabled
  ) values (
    new.id, true, true, telegram_opt_in, true, false, marketing_opt_in
  )
  on conflict (user_id) do nothing;

  if accepted_at_value is not null
     and coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> ''
     and coalesce(new.raw_user_meta_data ->> 'privacy_version', '') <> '' then
    insert into public.signup_consents (
      user_id, accepted_at, terms_version, privacy_version,
      telegram_notifications_opt_in, marketing_updates_opt_in
    ) values (
      new.id,
      accepted_at_value,
      new.raw_user_meta_data ->> 'terms_version',
      new.raw_user_meta_data ->> 'privacy_version',
      telegram_opt_in,
      marketing_opt_in
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notification_consent on auth.users;
create trigger on_auth_user_created_notification_consent
  after insert on auth.users
  for each row execute function public.initialize_user_notification_consent();

-- Existing accounts keep Telegram and SMS disabled until users opt in.
insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

