-- Additive Partner contracts. Existing mobile Auth, application states and
-- Storage policies are deliberately outside this migration.
set local lock_timeout='5s';
set local statement_timeout='30s';
create table private.partner_request_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table private.partner_request_limits enable row level security;
create index partner_request_limits_expiry on private.partner_request_limits(window_start);
revoke all on private.partner_request_limits from public, anon, authenticated;

create function private.partner_take_limit(p_key text, p_max integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into private.partner_request_limits as limits(key,window_start,attempts)
  values(p_key,clock_timestamp(),1)
  on conflict(key) do update set
    attempts = case when limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then 1 else least(limits.attempts+1,p_max+1) end,
    window_start = case when limits.window_start < clock_timestamp()-make_interval(secs=>p_seconds) then clock_timestamp() else limits.window_start end
  returning attempts into n;
  return n <= p_max;
end;
$$;
revoke all on function private.partner_take_limit(text,integer,integer) from public,anon,authenticated;

-- Only the server-side login function can resolve private identifiers.
-- Public clients receive neither account emails nor existence results.
create function private.resolve_partner_login(p_identifier text, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare normalized text; found_ids uuid[]; account_id uuid; account_email text; username_mode boolean:=left(btrim(p_identifier),1)='@';
begin
  if coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','') <> 'service_role' then raise exception 'Not permitted' using errcode='42501'; end if;
  if length(p_identifier)>254 or p_identifier is null or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  normalized:=lower(btrim(p_identifier));
  if username_mode then normalized:=substr(normalized,2); end if;
  if not username_mode and normalized ~ '^\+?[0-9 ()-]+$' then normalized:=private.normalize_login_phone(normalized); end if;
  if normalized is null or normalized='' then return null; end if;
  -- Bound database growth and credential stuffing independently of identifier existence.
  if not private.partner_take_limit('login:global',120,60) then return null; end if;
  if not private.partner_take_limit('login:ip:'||p_ip_hash,30,900) then return null; end if;
  if not private.partner_take_limit('login:id:'||md5(normalized),8,900) then return null; end if;
  delete from private.partner_request_limits where window_start < now()-interval '1 day';
  if normalized ~ '^\+[0-9]+$' then
    select array_agg(c.user_id) into found_ids from private.account_phone_credentials c where c.phone_e164=normalized;
  elsif normalized ~ '^[a-z0-9_]{3,30}$' then
    select array_agg(p.id) into found_ids from public.profiles p where lower(p.username)=normalized;
  else return null;
  end if;
  if coalesce(cardinality(found_ids),0)<>1 then return null; end if;
  account_id:=found_ids[1];
  select u.email into account_email from auth.users u where u.id=account_id
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<now())
    and coalesce(u.raw_app_meta_data->>'account_type','')<>'business_employee';
  if account_email is null then return null; end if;
  return jsonb_build_object('user_id',account_id,'email',account_email);
end;
$$;
revoke all on function private.resolve_partner_login(text,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.resolve_partner_login(text,text) to service_role;
create function public.resolve_partner_login(p_identifier text,p_ip_hash text)
returns jsonb language sql security invoker set search_path='' as $$ select private.resolve_partner_login(p_identifier,p_ip_hash) $$;
revoke all on function public.resolve_partner_login(text,text) from public,anon,authenticated;
grant execute on function public.resolve_partner_login(text,text) to service_role;

-- Public presentation only: professional evidence, legal identity and registration
-- data remain private. Both the current approval and request must agree.
create function private.get_partner_display_names(target_ids uuid[])
returns table(id uuid,display_name text,verified_doctor boolean)
language sql stable security definer set search_path = '' as $$
  select p.id,
    case when v.is_doctor then 'Dr '||regexp_replace(p.display_name,'^(Dr[.]?[[:space:]]+)+','','i') else p.display_name end,
    v.is_doctor
  from public.profiles p
  cross join lateral(select exists(
    select 1 from public.professional_verification_requests r
    join public.creator_commerce_access a on a.user_id=r.owner_id
    where r.owner_id=p.id and r.status::text='approved'
      and a.professional_status::text='approved' and a.creator_status::text='approved'
      and r.professional_category in ('Doctor','Medical','Dentist')
      and lower(btrim(r.professional_title)) in ('dr','dr.','doctor')
  ) as is_doctor) v
  where (select auth.uid()) is not null
    and p.id=any(target_ids[1:100]) and (not p.is_private or p.id=(select auth.uid()));
$$;
revoke all on function private.get_partner_display_names(uuid[]) from public,anon;
grant execute on function private.get_partner_display_names(uuid[]) to authenticated;
create function public.get_partner_display_names(target_ids uuid[])
returns table(id uuid,display_name text,verified_doctor boolean) language sql stable security invoker set search_path='' as $$ select * from private.get_partner_display_names(target_ids) $$;
revoke all on function public.get_partner_display_names(uuid[]) from public,anon;
grant execute on function public.get_partner_display_names(uuid[]) to authenticated;

create function private.search_partner_chat_usernames(p_query text)
returns table(id uuid,username text,display_name text,request_state text)
language plpgsql security definer set search_path = '' as $$
declare viewer uuid:=(select auth.uid()); normalized text:=lower(ltrim(btrim(p_query),'@'));
begin
  if viewer is null or exists(select 1 from auth.users u where u.id=viewer and u.raw_app_meta_data->>'account_type'='business_employee') then raise exception 'Personal account required' using errcode='42501'; end if;
  if not private.partner_take_limit('chat:search:'||viewer::text,30,60) then raise exception 'Please wait before searching again'; end if;
  if normalized !~ '^[a-z0-9_]{3,30}$' then return; end if;
  return query select p.id,p.username,p.display_name,
    case when exists(select 1 from public.connection_requests c where c.status='accepted' and ((c.requester_id=viewer and c.recipient_id=p.id) or (c.recipient_id=viewer and c.requester_id=p.id))) then 'accepted'
      when exists(select 1 from public.connection_requests c where c.status='pending' and c.requester_id=p.id and c.recipient_id=viewer) then 'incoming'
      when exists(select 1 from public.connection_requests c where c.status='pending' and c.requester_id=viewer and c.recipient_id=p.id) then 'outgoing' else 'none' end
    from public.profiles p where p.id<>viewer and not p.is_private and p.username_discoverable
      and left(lower(p.username),length(normalized))=normalized
      and not exists(select 1 from auth.users u where u.id=p.id and (u.raw_app_meta_data->>'account_type'='business_employee' or u.deleted_at is not null or u.banned_until>now()))
      and not exists(select 1 from public.connection_requests c where c.status='blocked' and ((c.requester_id=viewer and c.recipient_id=p.id) or (c.recipient_id=viewer and c.requester_id=p.id)))
    order by (lower(p.username)=normalized) desc,p.username limit 20;
end;
$$;
revoke all on function private.search_partner_chat_usernames(text) from public,anon;
grant execute on function private.search_partner_chat_usernames(text) to authenticated;
create function public.search_partner_chat_usernames(p_query text)
returns table(id uuid,username text,display_name text,request_state text) language sql security invoker set search_path='' as $$ select * from private.search_partner_chat_usernames(p_query) $$;
revoke all on function public.search_partner_chat_usernames(text) from public,anon;
grant execute on function public.search_partner_chat_usernames(text) to authenticated;

-- The existing recipient-only UPDATE policy did not protect identity columns,
-- and the requester INSERT policy allowed pre-accepted requests. Preserve mobile
-- pending/accept/decline calls while preventing consent and participant forgery.
create function private.guard_connection_request_identity()
returns trigger language plpgsql set search_path='' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if TG_OP='INSERT' and new.status<>'pending' then
    raise exception 'New requests must await recipient consent' using errcode='42501';
  end if;
  if TG_OP='UPDATE' and (new.id<>old.id or new.requester_id<>old.requester_id or new.recipient_id<>old.recipient_id or new.created_at<>old.created_at) then
    raise exception 'Request identity is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_connection_request_identity() from public,anon,authenticated;
create trigger partner_connection_identity_guard before insert or update on public.connection_requests
for each row execute function private.guard_connection_request_identity();

create function private.partner_chat_request(p_target uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare viewer uuid:=(select auth.uid()); convo uuid;
begin
  if viewer is null or p_target is null or p_target=viewer or p_action is null or p_action not in ('request','accept','decline') then raise exception 'Request unavailable' using errcode='42501'; end if;
  if exists(select 1 from auth.users u where u.id in (viewer,p_target) and (u.raw_app_meta_data->>'account_type'='business_employee' or u.deleted_at is not null or u.banned_until>now())) then raise exception 'Request unavailable' using errcode='42501'; end if;
  if not private.partner_take_limit('chat:request:'||viewer::text,20,60) then return jsonb_build_object('state','rate_limited'); end if;
  perform pg_advisory_xact_lock(hashtextextended(least(viewer,p_target)::text||':'||greatest(viewer,p_target)::text,0));
  if exists(select 1 from public.connection_requests c where c.status='blocked' and ((c.requester_id=viewer and c.recipient_id=p_target) or (c.recipient_id=viewer and c.requester_id=p_target))) then raise exception 'Request unavailable' using errcode='42501'; end if;
  if p_action='decline' then
    update public.connection_requests set status='declined' where requester_id=p_target and recipient_id=viewer and status='pending';
    return jsonb_build_object('state','declined');
  end if;
  if p_action='accept' then
    convo:=public.accept_personal_message_request(p_target);
    return jsonb_build_object('state','accepted','conversation_id',convo);
  end if;
  if not exists(select 1 from public.profiles p where p.id=p_target and not p.is_private and p.username_discoverable) then raise exception 'Request unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.connection_requests c where c.status='accepted' and ((c.requester_id=viewer and c.recipient_id=p_target) or (c.recipient_id=viewer and c.requester_id=p_target))) then
    convo:=public.open_personal_conversation(p_target);
    return jsonb_build_object('state','accepted','conversation_id',convo);
  end if;
  if exists(select 1 from public.connection_requests c where c.status='pending' and c.requester_id=p_target and c.recipient_id=viewer) then return jsonb_build_object('state','incoming'); end if;
  if exists(select 1 from public.connection_requests c where c.status='declined' and ((c.requester_id=viewer and c.recipient_id=p_target) or (c.recipient_id=viewer and c.requester_id=p_target))) then raise exception 'Request unavailable' using errcode='42501'; end if;
  insert into public.connection_requests(requester_id,recipient_id,status) values(viewer,p_target,'pending') on conflict(requester_id,recipient_id) do nothing;
  return jsonb_build_object('state','outgoing');
end;
$$;
revoke all on function private.partner_chat_request(uuid,text) from public,anon;
grant execute on function private.partner_chat_request(uuid,text) to authenticated;
create function public.partner_chat_request(p_target uuid,p_action text)
returns jsonb language sql security invoker set search_path='' as $$ select private.partner_chat_request(p_target,p_action) $$;
revoke all on function public.partner_chat_request(uuid,text) from public,anon;
grant execute on function public.partner_chat_request(uuid,text) to authenticated;

create function private.list_partner_chat_requests()
returns table(id uuid,username text,display_name text,request_state text)
language plpgsql security definer set search_path='' as $$
declare viewer uuid:=(select auth.uid());
begin
  if viewer is null or exists(select 1 from auth.users u where u.id=viewer and u.raw_app_meta_data->>'account_type'='business_employee') then raise exception 'Personal account required' using errcode='42501'; end if;
  return query select p.id,p.username,p.display_name,'incoming'::text from public.connection_requests c join public.profiles p on p.id=c.requester_id
  where c.recipient_id=viewer and c.status='pending'
    and not exists(select 1 from auth.users u where u.id=p.id and (u.raw_app_meta_data->>'account_type'='business_employee' or u.deleted_at is not null or u.banned_until>now()))
    and not exists(select 1 from public.connection_requests b where b.status='blocked' and ((b.requester_id=viewer and b.recipient_id=p.id) or (b.recipient_id=viewer and b.requester_id=p.id)))
  order by c.created_at desc limit 50;
end;
$$;
revoke all on function private.list_partner_chat_requests() from public,anon;
grant execute on function private.list_partner_chat_requests() to authenticated;
create function public.list_partner_chat_requests()
returns table(id uuid,username text,display_name text,request_state text) language sql security invoker set search_path='' as $$ select * from private.list_partner_chat_requests() $$;
revoke all on function public.list_partner_chat_requests() from public,anon;
grant execute on function public.list_partner_chat_requests() to authenticated;
