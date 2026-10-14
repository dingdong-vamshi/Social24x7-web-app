-- Applied migration version: 20261014175831 (Supabase-assigned).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $check$
BEGIN
  IF (SELECT md5(pg_get_functiondef('public.cleanup_expired_chat_messages(integer)'::regprocedure))) <> 'badd5e7b3f5ffa5caf94b638f85943d6'
    OR (SELECT md5(pg_get_functiondef('public.process_scheduled_chat_messages(integer)'::regprocedure))) <> '7978ea94027b15581d84469324112f53'
    OR EXISTS (SELECT 1 FROM pg_proc WHERE oid IN ('public.cleanup_expired_chat_messages(integer)'::regprocedure,'public.process_scheduled_chat_messages(integer)'::regprocedure)
      AND (proacl::text <> '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' OR pg_get_userbyid(proowner) <> 'postgres'))
  THEN RAISE EXCEPTION 'Maintenance repair drift: stop and review'; END IF;
END $check$;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_scheduled_chat_messages(integer) FROM public, anon, authenticated;
DO $verify$
DECLARE f regprocedure; r text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.cleanup_expired_chat_messages(integer)'::regprocedure,'public.process_scheduled_chat_messages(integer)'::regprocedure] LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'Unexpected remaining execute grant'; END IF;
    END LOOP;
    FOREACH r IN ARRAY ARRAY['postgres','service_role'] LOOP
      IF NOT has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'Trusted execution was lost'; END IF;
    END LOOP;
  END LOOP;
END $verify$;
COMMIT;
