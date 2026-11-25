-- Safe, serialized Celo wallet provisioning.
-- Apply this migration before deploying the updated wallet Edge Functions.
create or replace function public.provision_celo_wallet(
  p_user_id uuid,
  p_wallet_address text,
  p_encrypted_wallet text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_address text;
  v_existing_encrypted text;
begin
  if p_user_id is null
     or p_wallet_address is null
     or p_encrypted_wallet is null
     or length(trim(p_encrypted_wallet)) = 0
     or p_wallet_address !~* '^0x[a-f0-9]{40}$' then
    raise exception 'Invalid wallet provisioning input';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select celo_wallet_address
    into v_existing_address
    from public.profiles
   where user_id = p_user_id
   for update;

  if not found then
    raise exception 'Profile not found for user';
  end if;

  select encrypted_wallet
    into v_existing_encrypted
    from public.user_secrets
   where user_id = p_user_id
   for update;

  -- Preserve all legacy key material. If the address is absent, investigate
  -- the encrypted key before associating a new address or replacing the key.
  if v_existing_encrypted is not null and length(trim(v_existing_encrypted)) > 0
     and v_existing_address is null then
    return jsonb_build_object('status', 'orphaned_key', 'address', null);
  end if;

  if v_existing_address is not null then
    if v_existing_encrypted is not null and length(trim(v_existing_encrypted)) > 0 then
      return jsonb_build_object('status', 'exists', 'address', v_existing_address);
    end if;

    return jsonb_build_object('status', 'needs_recovery', 'address', v_existing_address);
  end if;

  insert into public.user_secrets (user_id, encrypted_wallet)
  values (p_user_id, p_encrypted_wallet)
  on conflict (user_id) do update
    set encrypted_wallet = excluded.encrypted_wallet;

  update public.profiles
     set celo_wallet_address = lower(p_wallet_address)
   where user_id = p_user_id
     and celo_wallet_address is null;

  if not found then
    raise exception 'Wallet address was concurrently assigned; transaction rolled back';
  end if;

  return jsonb_build_object('status', 'created', 'address', lower(p_wallet_address));
end;
$$;

revoke all on function public.provision_celo_wallet(uuid, text, text) from public;
revoke all on function public.provision_celo_wallet(uuid, text, text) from anon;
revoke all on function public.provision_celo_wallet(uuid, text, text) from authenticated;
grant execute on function public.provision_celo_wallet(uuid, text, text) to service_role;
