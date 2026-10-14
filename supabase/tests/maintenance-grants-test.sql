-- Run on the disposable fixture only. Trusted calls operate on empty tables.
BEGIN;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.cleanup_expired_chat_messages(1); RAISE EXCEPTION 'Anonymous cleanup unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.process_scheduled_chat_messages(1); RAISE EXCEPTION 'Anonymous scheduler unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.cleanup_expired_chat_messages(1); RAISE EXCEPTION 'User cleanup unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.process_scheduled_chat_messages(1); RAISE EXCEPTION 'User scheduler unexpectedly allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  IF public.cleanup_expired_chat_messages(1) <> 0 OR public.process_scheduled_chat_messages(1) <> 0 THEN RAISE EXCEPTION 'Empty fixture should do no work'; END IF;
END $$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE postgres;
DO $$ BEGIN
  IF public.cleanup_expired_chat_messages(1) <> 0 OR public.process_scheduled_chat_messages(1) <> 0 THEN RAISE EXCEPTION 'Empty fixture should do no work'; END IF;
END $$;
ROLLBACK;
