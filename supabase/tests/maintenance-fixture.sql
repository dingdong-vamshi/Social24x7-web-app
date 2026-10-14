-- LOCAL disposable database only. Real captured function bodies, empty fixture tables.
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$;
CREATE TYPE public.message_kind AS ENUM('text','order','system');
CREATE TABLE public.messages(id uuid, expires_at timestamptz, deleted_at timestamptz, sender_id uuid, kind public.message_kind, payload jsonb, body text);
CREATE TABLE public.scheduled_chat_messages(id uuid,status text,send_at timestamptz);
GRANT USAGE ON SCHEMA public TO postgres,service_role;
GRANT SELECT, UPDATE ON public.messages,public.scheduled_chat_messages TO postgres;
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages(target_limit integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare expired_ids uuid[]; paths text[]; cleaned integer:=0;
begin
  select array_agg(id) into expired_ids from (
    select id from public.messages
    where expires_at<=now() and deleted_at is null
      and sender_id is not null
      and kind not in ('order'::public.message_kind,'system'::public.message_kind)
    order by expires_at,id
    for update skip locked
    limit least(greatest(coalesce(target_limit,200),1),500)
  ) due;
  if expired_ids is null then return 0; end if;
  select array_agg(attachment.storage_path) into paths
  from public.chat_attachments attachment
  join public.messages message on message.payload->>'attachment_id'=attachment.id::text
  where message.id=any(expired_ids) and attachment.storage_bucket='chat-media';
  if paths is not null then delete from storage.objects where bucket_id='chat-media' and name=any(paths); end if;
  update public.chat_attachments set status='deleted'
  where id::text in(select message.payload->>'attachment_id' from public.messages message where message.id=any(expired_ids) and message.payload?'attachment_id');
  update public.messages set body='',payload=jsonb_build_object('expired',true),deleted_at=now() where id=any(expired_ids);
  get diagnostics cleaned=row_count;
  return cleaned;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.process_scheduled_chat_messages(target_limit integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare schedule_row public.scheduled_chat_messages%rowtype; inserted_message public.messages; sent_count integer := 0;
begin
  for schedule_row in
    select * from public.scheduled_chat_messages
    where status = 'pending' and send_at <= now()
    order by send_at, id
    for update skip locked
    limit least(greatest(coalesce(target_limit, 50), 1), 100)
  loop
    if not private.chat_send_permitted(schedule_row.created_by, schedule_row.conversation_id) then
      update public.scheduled_chat_messages
      set status = 'cancelled', last_error = 'Conversation delivery permission was revoked before send.', updated_at = now()
      where id = schedule_row.id
      returning * into schedule_row;
      if schedule_row.assistant_action_id is not null then
        update public.ai_assistant_actions
        set result = result || jsonb_build_object(
              'schedule_status', 'cancelled',
              'error', schedule_row.last_error
            ),
            updated_at = now()
        where id = schedule_row.assistant_action_id
          and owner_user_id = schedule_row.created_by;
        perform private.record_ai_schedule_terminal_entry(schedule_row, 'cancelled');
      end if;
      continue;
    end if;
    begin
      update public.scheduled_chat_messages
      set status = 'sending', attempts = attempts + 1, updated_at = now()
      where id = schedule_row.id;
      inserted_message := private.deliver_chat_text_message(
        schedule_row.created_by,
        schedule_row.conversation_id,
        schedule_row.body,
        schedule_row.payload,
        schedule_row.idempotency_key
      );
      update public.scheduled_chat_messages
      set status = 'sent', message_id = inserted_message.id, last_error = null, updated_at = now()
      where id = schedule_row.id
      returning * into schedule_row;
      if schedule_row.assistant_action_id is not null then
        update public.ai_assistant_actions
        set result = result || jsonb_build_object(
              'message_id', inserted_message.id,
              'schedule_status', 'sent'
            ),
            updated_at = now()
        where id = schedule_row.assistant_action_id
          and owner_user_id = schedule_row.created_by;
        perform private.record_ai_schedule_terminal_entry(schedule_row, 'sent');
      end if;
      sent_count := sent_count + 1;
    exception when others then
      update public.scheduled_chat_messages
      set status = case when attempts >= 5 then 'failed' else 'pending' end,
        last_error = left(sqlerrm, 500), updated_at = now()
      where id = schedule_row.id
      returning * into schedule_row;
      if schedule_row.status = 'failed' and schedule_row.assistant_action_id is not null then
        update public.ai_assistant_actions
        set result = result || jsonb_build_object(
              'schedule_status', 'failed',
              'error', schedule_row.last_error
            ),
            updated_at = now()
        where id = schedule_row.assistant_action_id
          and owner_user_id = schedule_row.created_by;
        perform private.record_ai_schedule_terminal_entry(schedule_row, 'failed');
      end if;
    end;
  end loop;
  return sent_count;
end;
$function$
;
ALTER FUNCTION public.cleanup_expired_chat_messages(integer) OWNER TO postgres;
ALTER FUNCTION public.process_scheduled_chat_messages(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(integer),public.process_scheduled_chat_messages(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(integer),public.process_scheduled_chat_messages(integer) TO anon,authenticated,service_role;
