-- STAGED ONLY. Not activated in production. No Auth session issuance or chat changes.
begin;
set local lock_timeout = '5s';
create schema if not exists private;
create table private.customer_pairing_challenges (
  id uuid primary key,
  browser_hash text not null check (browser_hash ~ '^[0-9a-f]{64}$'),
  scan_hash text not null check (scan_hash ~ '^[0-9a-f]{64}$'),
  rate_hash text not null check (rate_hash ~ '^[0-9a-f]{64}$'),
  device_label text not null check (length(device_label) between 1 and 80),
  state text not null default 'pending' check (state in ('pending','approved','cancelled','expired','consumed')),
  approved_user uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default clock_timestamp() + interval '2 minutes',
  updated_at timestamptz not null default clock_timestamp(),
  check (expires_at > created_at and expires_at <= created_at + interval '121 seconds'),
  check (state not in ('approved','consumed') or approved_user is not null)
);
create index customer_pairing_rate_time on private.customer_pairing_challenges(rate_hash,created_at);
create index customer_pairing_created on private.customer_pairing_challenges(created_at);
alter table private.customer_pairing_challenges enable row level security;
create policy customer_pairing_service on private.customer_pairing_challenges to service_role using (true) with check (true);
revoke all on private.customer_pairing_challenges from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.customer_pairing_challenges to service_role;

-- Service-only gateway: callers cannot directly access this through a personal JWT.
-- Proof hashes are produced by the trusted Edge adapter; plaintext proofs are never stored.
create function public.customer_pairing_create(challenge_id uuid,browser_proof_hash text,scan_proof_hash text,client_rate_hash text,device text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r private.customer_pairing_challenges;
begin
  perform pg_catalog.pg_advisory_xact_lock(742710151);
  delete from private.customer_pairing_challenges where created_at < clock_timestamp()-interval '1 day';
  if (select count(*) from private.customer_pairing_challenges where created_at > clock_timestamp()-interval '1 minute') >= 200
    or (select count(*) from private.customer_pairing_challenges where rate_hash=client_rate_hash and created_at > clock_timestamp()-interval '1 minute') >= 5
  then raise exception 'Pairing rate limit exceeded' using errcode='P0001'; end if;
  insert into private.customer_pairing_challenges(id,browser_hash,scan_hash,rate_hash,device_label)
    values(challenge_id,browser_proof_hash,scan_proof_hash,client_rate_hash,device) returning * into r;
  return jsonb_build_object('id',r.id,'state',r.state,'expiresAt',r.expires_at,'device',r.device_label);
end $$;

-- approve/consume are groundwork only. The shipped HTTP handler does NOT expose
-- them. A reviewed mobile approval + supported Auth exchange must precede activation.
create function public.customer_pairing_transition(challenge_id uuid,proof_hash text,operation text,verified_user uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r private.customer_pairing_challenges;
begin
  if operation not in ('status','cancel','inspect','approve','consume') then raise exception 'Invalid pairing operation'; end if;
  select * into r from private.customer_pairing_challenges where id=challenge_id for update;
  if not found or proof_hash is null or proof_hash <> (case when operation in ('inspect','approve') then r.scan_hash else r.browser_hash end)
    then raise exception 'Pairing challenge unavailable'; end if;
  if operation in ('inspect','approve','consume') and verified_user is null then raise exception 'Authenticated approval required'; end if;
  if r.state in ('pending','approved') and r.expires_at <= clock_timestamp() then
    update private.customer_pairing_challenges set state='expired',updated_at=clock_timestamp() where id=r.id returning * into r;
  end if;
  if operation='approve' then
    if r.state <> 'pending' then raise exception 'Challenge is not pending'; end if;
    update private.customer_pairing_challenges set state='approved',approved_user=verified_user,updated_at=clock_timestamp() where id=r.id returning * into r;
  elsif operation='consume' then
    if r.state <> 'approved' or r.approved_user is distinct from verified_user then raise exception 'Challenge not approved for this identity'; end if;
    update private.customer_pairing_challenges set state='consumed',updated_at=clock_timestamp() where id=r.id returning * into r;
  elsif operation='cancel' and r.state in ('pending','approved') then
    update private.customer_pairing_challenges set state='cancelled',updated_at=clock_timestamp() where id=r.id returning * into r;
  end if;
  -- Never return account identity, proof material or Auth credentials to status polling.
  return jsonb_build_object('id',r.id,'state',r.state,'expiresAt',r.expires_at,'device',r.device_label);
end $$;
revoke all on function public.customer_pairing_create(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.customer_pairing_transition(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.customer_pairing_create(uuid,text,text,text,text) to service_role;
grant execute on function public.customer_pairing_transition(uuid,text,text,uuid) to service_role;
commit;
