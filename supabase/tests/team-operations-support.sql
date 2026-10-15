-- LOCAL fixture extension only; never apply to production.
grant usage on schema private to authenticated;
create table public.chat_attachments(id uuid primary key,conversation_id uuid,sender_id uuid,storage_bucket text,storage_path text,attachment_type text,original_filename text,mime_type text,status text);
create table public.chat_polls(id uuid primary key,conversation_id uuid,message_id uuid,question text,status text);
create table public.chat_poll_options(id uuid,poll_id uuid,position integer,label text);
create table public.chat_events(id uuid primary key,conversation_id uuid,message_id uuid,title text,starts_at timestamptz,location text,description text);
CREATE OR REPLACE FUNCTION private.business_representative_payload(target_sender uuid, target_conversation uuid, target_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  conversation public.conversations%rowtype;
  representative record;
begin
  select * into conversation from public.conversations where id = target_conversation;
  if conversation.kind <> 'business'
    or conversation.business_context <> 'buyer_seller'
    or conversation.business_customer_id = target_sender then
    return coalesce(target_payload, '{}'::jsonb) - 'business_representative';
  end if;
  select
    member.id,
    coalesce(member.verified_display_name, member.full_name) as display_name,
    member.customer_tagline,
    storefront.name as company_name,
    member.status = 'verified'
      and storefront.active
      and storefront.verification_status = 'approved' as verified
  into representative
  from public.storefront_team_memberships member
  join public.storefronts storefront on storefront.id = member.storefront_id
  where member.auth_user_id = target_sender
    and member.storefront_id = conversation.storefront_id
  limit 1;
  if representative.id is null then
    return coalesce(target_payload, '{}'::jsonb) - 'business_representative';
  end if;
  return (coalesce(target_payload, '{}'::jsonb) - 'business_representative')
    || jsonb_build_object(
      'business_representative', jsonb_build_object(
        'membership_id', representative.id,
        'name', representative.display_name,
        'tagline', representative.customer_tagline,
        'company', representative.company_name,
        'verified', representative.verified
      )
    );
end;
$function$

