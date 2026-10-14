-- Emergency rollback only: restores the reviewed prior exposure.
BEGIN;
SET LOCAL lock_timeout = '5s';
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_scheduled_chat_messages(integer) TO anon, authenticated;
COMMIT;
