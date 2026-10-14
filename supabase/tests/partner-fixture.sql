-- Synthetic LOCAL-ONLY fixture; not a production migration.
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;create role authenticated nologin;create role service_role nologin;end if;end $$;
create schema auth;
create schema private;
grant usage on schema auth,public,private to authenticated,anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,raw_app_meta_data jsonb default '{}');
create table public.profiles(id uuid primary key,username text,display_name text,is_private boolean default false,username_discoverable boolean default true);
create table private.account_phone_credentials(user_id uuid,phone_e164 text,is_legacy_shared boolean default false);
create table public.creator_commerce_access(user_id uuid primary key,creator_status text,professional_status text);
create table public.professional_verification_requests(owner_id uuid,status text,professional_category text,professional_title text);
create table public.connection_requests(id uuid primary key default gen_random_uuid(),requester_id uuid references profiles(id),recipient_id uuid references profiles(id),status text check(status in ('pending','accepted','declined','blocked')),created_at timestamptz default now(),unique(requester_id,recipient_id),check(requester_id<>recipient_id));
alter table public.connection_requests enable row level security;
grant select,insert,update on public.connection_requests to authenticated;
create policy "connection parties" on public.connection_requests for select to authenticated using(requester_id=auth.uid() or recipient_id=auth.uid());
create policy "connection requester create" on public.connection_requests for insert to authenticated with check(requester_id=auth.uid());
create policy "connection recipient update" on public.connection_requests for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
create table public.conversations(id uuid primary key default gen_random_uuid(),kind text,created_by uuid,updated_at timestamptz default now());
create table public.conversation_participants(conversation_id uuid,user_id uuid,unique(conversation_id,user_id));
create table public.direct_conversation_pairs(user_low uuid,user_high uuid,conversation_id uuid,unique(user_low,user_high));
CREATE OR REPLACE FUNCTION private.normalize_login_phone(p_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if length(digits) = 10 then
    digits := '91' || digits;
  end if;
  if digits !~ '^[1-9][0-9]{7,14}$' then
    return null;
  end if;
  return '+' || digits;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.accept_personal_message_request(requester uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'Authentication required.';
  end if;

  if requester is null or requester = viewer then
    raise exception 'Invalid requester.';
  end if;

  update public.connection_requests
  set status = 'accepted'
  where requester_id = requester
    and recipient_id = viewer
    and status in ('pending', 'accepted');

  if not found then
    raise exception 'No incoming message request found.';
  end if;

  return public.open_personal_conversation(requester);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.open_personal_conversation(participant uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  viewer uuid := auth.uid();
  low_user uuid;
  high_user uuid;
  existing_conversation uuid;
begin
  if viewer is null then
    raise exception 'Authentication required.';
  end if;

  if participant is null or participant = viewer then
    raise exception 'Invalid participant.';
  end if;

  if not exists (
    select 1
    from public.connection_requests cr
    where cr.status = 'accepted'
      and (
        (cr.requester_id = viewer and cr.recipient_id = participant)
        or (cr.requester_id = participant and cr.recipient_id = viewer)
      )
  ) then
    raise exception 'Message request has not been accepted.';
  end if;

  low_user := least(viewer, participant);
  high_user := greatest(viewer, participant);

  perform pg_advisory_xact_lock(hashtextextended(low_user::text || ':' || high_user::text, 0));

  select dcp.conversation_id
  into existing_conversation
  from public.direct_conversation_pairs dcp
  where dcp.user_low = low_user
    and dcp.user_high = high_user;

  if existing_conversation is not null then
    return existing_conversation;
  end if;

  select c.id
  into existing_conversation
  from public.conversations c
  join public.conversation_participants cp_viewer
    on cp_viewer.conversation_id = c.id
   and cp_viewer.user_id = viewer
  join public.conversation_participants cp_participant
    on cp_participant.conversation_id = c.id
   and cp_participant.user_id = participant
  where c.kind = 'personal'
  order by c.updated_at desc
  limit 1;

  if existing_conversation is null then
    insert into public.conversations (kind, created_by)
    values ('personal', viewer)
    returning id into existing_conversation;

    insert into public.conversation_participants (conversation_id, user_id)
    values
      (existing_conversation, viewer),
      (existing_conversation, participant)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  insert into public.direct_conversation_pairs (user_low, user_high, conversation_id)
  values (low_user, high_user, existing_conversation)
  on conflict (user_low, user_high) do update
    set conversation_id = excluded.conversation_id;

  return existing_conversation;
end;
$function$
;
insert into auth.users(id,email,email_confirmed_at) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'qa'||i||'@example.test',now() from generate_series(1,10) i;
insert into public.profiles(id,username,display_name) select id,'qa_'||row_number() over(order by id),'Synthetic '||row_number() over(order by id) from auth.users;
update auth.users set raw_app_meta_data='{"account_type":"business_employee"}' where email='qa5@example.test';
update auth.users set email_confirmed_at=null where email='qa6@example.test';
update auth.users set banned_until=now()+interval '1 day' where email='qa7@example.test';
update auth.users set deleted_at=now() where email='qa8@example.test';
update public.profiles set is_private=true where username='qa_3';
update public.profiles set username_discoverable=false where username='qa_4';
insert into private.account_phone_credentials(user_id,phone_e164,is_legacy_shared) select id,case when email in ('qa2@example.test','qa3@example.test') then '+919999999992' else '+919999999991' end,email in ('qa2@example.test','qa3@example.test') from auth.users where email in ('qa1@example.test','qa2@example.test','qa3@example.test');
