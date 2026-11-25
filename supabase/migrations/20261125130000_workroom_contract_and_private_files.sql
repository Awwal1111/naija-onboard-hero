-- WorkRoom reliability: contract activation and private file storage.
-- Reuses existing tables; no new tables, realtime, or scheduled jobs.

create or replace function public.sign_hire_contract(p_contract_id uuid, p_signature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_c public.hire_contracts%rowtype;
  v_hold numeric;
  v_balance numeric;
  v_fee numeric;
  v_room_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;
  if length(trim(coalesce(p_signature, ''))) < 2 then
    return jsonb_build_object('success', false, 'error', 'A valid signature is required');
  end if;

  select * into v_c from public.hire_contracts where id = p_contract_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Contract not found');
  end if;
  if v_actor not in (v_c.client_id, v_c.expert_id) then
    return jsonb_build_object('success', false, 'error', 'Not a party to this contract');
  end if;
  if v_c.status not in ('pending_expert_signature','pending_client_signature') then
    return jsonb_build_object('success', false, 'error', 'Contract not awaiting signature');
  end if;

  if v_actor = v_c.client_id then
    update public.hire_contracts
      set client_signature = p_signature, client_signed_at = now(), updated_at = now()
      where id = p_contract_id;
  else
    update public.hire_contracts
      set expert_signature = p_signature, expert_signed_at = now(), updated_at = now()
      where id = p_contract_id;
  end if;

  select * into v_c from public.hire_contracts where id = p_contract_id for update;

  if v_c.client_signed_at is not null and v_c.expert_signed_at is not null and v_c.escrow_held = 0 then
    v_hold := case when v_c.contract_type = 'fixed' then v_c.total_amount else coalesce(v_c.deposit_amount, 0) end;
    if v_hold > 0 then
      select balance_withdrawable into v_balance
        from public.profiles where user_id = v_c.client_id for update;
      if v_balance is null or v_balance < v_hold then
        raise exception 'Insufficient NC balance for escrow';
      end if;
      v_fee := v_hold * 0.05;
      update public.profiles
        set balance_withdrawable = balance_withdrawable - v_hold,
            wallet_balance = wallet_balance - v_hold,
            updated_at = now()
        where user_id = v_c.client_id;
      update public.hire_contracts
        set escrow_held = v_hold, platform_fee = v_fee, status = 'active', updated_at = now()
        where id = p_contract_id;
      insert into public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
      values (v_c.client_id, 'hire_contract_escrow', -v_hold, 'completed',
        'Hire contract escrow: ' || v_c.title,
        jsonb_build_object('contract_id', p_contract_id, 'expert_id', v_c.expert_id));
    else
      update public.hire_contracts set status = 'active', updated_at = now() where id = p_contract_id;
    end if;

    -- Idempotent: the contract_id link prevents duplicate WorkRooms on retries.
    select id into v_room_id from public.workrooms where contract_id = p_contract_id limit 1;
    if v_room_id is null then
      insert into public.workrooms(
        owner_id, name, description, project_type, total_budget, deadline,
        contract_id, hourly_rate, payment_type
      ) values (
        v_c.client_id, v_c.title, v_c.scope, 'Hiring Contract',
        case when v_c.contract_type = 'fixed' then v_c.total_amount else v_c.deposit_amount end,
        v_c.deadline, p_contract_id, coalesce(v_c.hourly_rate, 0), v_c.contract_type
      ) returning id into v_room_id;

      insert into public.workroom_members(workroom_id, user_id, role, permissions, hourly_rate)
      values
        (v_room_id, v_c.client_id, 'owner', array['read','write','comment','upload','manage'], null),
        (v_room_id, v_c.expert_id, 'freelancer', array['read','write','comment','upload'], v_c.hourly_rate)
      on conflict do nothing;

      insert into public.workroom_activities(workroom_id, user_id, activity_type, description, metadata)
      values (v_room_id, v_actor, 'workroom_created', 'WorkRoom created for signed hiring contract',
        jsonb_build_object('contract_id', p_contract_id));
      insert into public.notifications(user_id, title, message, type, metadata)
      values
        (v_c.client_id, 'Your WorkRoom is ready', 'Your contract is signed and its WorkRoom is ready.', 'workroom',
          jsonb_build_object('workroom_id', v_room_id, 'contract_id', p_contract_id)),
        (v_c.expert_id, 'Your WorkRoom is ready', 'Your contract is signed and its WorkRoom is ready.', 'workroom',
          jsonb_build_object('workroom_id', v_room_id, 'contract_id', p_contract_id));
    end if;
  end if;

  insert into public.hire_contract_events(contract_id, actor_id, event_type, payload)
  values (p_contract_id, v_actor, 'signed',
    jsonb_build_object('role', case when v_actor = v_c.client_id then 'client' else 'expert' end));

  return jsonb_build_object('success', true, 'workroom_id', v_room_id);
end;
$function$;

-- Private bucket, limited file size. Object path: workroom UUID / uploader UUID / filename.
insert into storage.buckets(id, name, public, file_size_limit)
values ('workroom-files', 'workroom-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "WorkRoom members can upload files" on storage.objects;
create policy "WorkRoom members can upload files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'workroom-files'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.workroom_members m
    where m.workroom_id::text = (storage.foldername(name))[1]
      and m.user_id = auth.uid()
  )
);

drop policy if exists "WorkRoom members can read files" on storage.objects;
create policy "WorkRoom members can read files"
on storage.objects for select to authenticated
using (
  bucket_id = 'workroom-files'
  and exists (
    select 1 from public.workroom_members m
    where m.workroom_id::text = (storage.foldername(name))[1]
      and m.user_id = auth.uid()
  )
);

drop policy if exists "WorkRoom uploaders can delete own files" on storage.objects;
create policy "WorkRoom uploaders can delete own files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'workroom-files'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.workroom_members m
    where m.workroom_id::text = (storage.foldername(name))[1]
      and m.user_id = auth.uid()
  )
);


-- Work Diary approvals and payouts must be performed atomically on the server.
create or replace function public.approve_work_diary_entries(p_entry_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_room_id uuid;
  v_count integer;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(array_length(p_entry_ids, 1), 0) = 0 then
    raise exception 'Select at least one time entry';
  end if;

  select min(workroom_id), count(*)
    into v_room_id, v_count
  from public.work_diary_entries
  where id = any(p_entry_ids)
    and workroom_id is not null
    and ended_at is not null
    and billable = true
    and coalesce(is_approved, false) = false
    and coalesce(payment_status, 'pending') = 'pending';

  if v_count <> cardinality(p_entry_ids) then
    raise exception 'Some entries are missing, already approved, unpaid status changed, or not billable';
  end if;
  if exists (
    select 1 from public.work_diary_entries
    where id = any(p_entry_ids) and workroom_id is distinct from v_room_id
  ) then
    raise exception 'Approve entries from one WorkRoom at a time';
  end if;
  if not exists (
    select 1 from public.workrooms w
    where w.id = v_room_id and w.owner_id = v_actor
  ) then
    raise exception 'Only the WorkRoom client can approve time';
  end if;

  perform 1 from public.work_diary_entries
  where id = any(p_entry_ids)
  order by id
  for update;

  update public.work_diary_entries
  set is_approved = true, approved_by = v_actor, approved_at = now()
  where id = any(p_entry_ids)
    and workroom_id = v_room_id
    and ended_at is not null
    and billable = true
    and coalesce(is_approved, false) = false
    and coalesce(payment_status, 'pending') = 'pending';

  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_entry_ids) then
    raise exception 'Time entries changed during approval; refresh and try again';
  end if;

  return jsonb_build_object('success', true, 'approved_count', v_count);
end;
$function$;

create or replace function public.pay_work_diary_entries(p_entry_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_room_id uuid;
  v_freelancer_id uuid;
  v_count integer;
  v_total numeric(18,2);
  v_balance numeric(18,2);
  v_withdrawable numeric(18,2);
  v_entry_count integer;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(array_length(p_entry_ids, 1), 0) = 0 then
    raise exception 'Select at least one time entry';
  end if;

  perform 1 from public.work_diary_entries
  where id = any(p_entry_ids)
  order by id
  for update;

  select min(workroom_id), min(user_id), count(*),
         round(sum((duration_minutes::numeric / 60) * hourly_rate), 2)
    into v_room_id, v_freelancer_id, v_count, v_total
  from public.work_diary_entries
  where id = any(p_entry_ids)
    and workroom_id is not null
    and ended_at is not null
    and billable = true
    and coalesce(is_approved, false) = true
    and coalesce(payment_status, 'pending') = 'pending'
    and duration_minutes > 0
    and hourly_rate > 0;

  if v_count <> cardinality(p_entry_ids) then
    raise exception 'Some entries are not approved, payable, or have invalid hours';
  end if;
  if exists (
    select 1 from public.work_diary_entries
    where id = any(p_entry_ids)
      and (workroom_id is distinct from v_room_id or user_id is distinct from v_freelancer_id)
  ) then
    raise exception 'Pay one freelancer in one WorkRoom at a time';
  end if;
  if v_freelancer_id = v_actor then
    raise exception 'A client cannot pay their own time entries';
  end if;
  if not exists (
    select 1 from public.workrooms w
    where w.id = v_room_id and w.owner_id = v_actor
  ) then
    raise exception 'Only the WorkRoom client can pay these entries';
  end if;

  select wallet_balance, balance_withdrawable
    into v_balance, v_withdrawable
  from public.profiles
  where user_id = v_actor
  for update;

  if v_balance is null or v_withdrawable is null
     or v_balance < v_total or v_withdrawable < v_total then
    return jsonb_build_object('success', false, 'error', 'Insufficient withdrawable NC balance', 'needed', v_total);
  end if;

  update public.profiles
  set wallet_balance = wallet_balance - v_total,
      balance_withdrawable = balance_withdrawable - v_total,
      updated_at = now()
  where user_id = v_actor;

  update public.profiles
  set wallet_balance = wallet_balance + v_total,
      balance_withdrawable = balance_withdrawable + v_total,
      updated_at = now()
  where user_id = v_freelancer_id;

  insert into public.wallet_transactions(user_id, amount, currency, kind, status, reference, metadata)
  values
    (v_actor, -v_total, 'NC', 'hourly_payment', 'completed',
      'Work Diary payment', jsonb_build_object('workroom_id', v_room_id, 'freelancer_id', v_freelancer_id, 'entry_ids', p_entry_ids)),
    (v_freelancer_id, v_total, 'NC', 'hourly_earning', 'completed',
      'Work Diary earnings', jsonb_build_object('workroom_id', v_room_id, 'client_id', v_actor, 'entry_ids', p_entry_ids));

  update public.work_diary_entries
  set payment_status = 'paid'
  where id = any(p_entry_ids)
    and workroom_id = v_room_id
    and user_id = v_freelancer_id
    and is_approved = true
    and coalesce(payment_status, 'pending') = 'pending';

  get diagnostics v_entry_count = row_count;
  if v_entry_count <> cardinality(p_entry_ids) then
    raise exception 'Entries changed during payment; transaction cancelled';
  end if;

  insert into public.notifications(user_id, title, message, type, metadata)
  values (v_freelancer_id, 'Payment received', 'NC ' || v_total::text || ' has been paid for approved Work Diary hours.',
    'payment', jsonb_build_object('amount', v_total, 'entry_count', v_entry_count, 'workroom_id', v_room_id));

  return jsonb_build_object('success', true, 'amount', v_total, 'entry_count', v_entry_count);
end;
$function$;

revoke all on function public.approve_work_diary_entries(uuid[]) from public, anon;
revoke all on function public.pay_work_diary_entries(uuid[]) from public, anon;
grant execute on function public.approve_work_diary_entries(uuid[]) to authenticated;
grant execute on function public.pay_work_diary_entries(uuid[]) to authenticated;
