# Shared-backend maintenance function access — repaired

Update, 14 October 2026: explicitly authorized closure repair applied as migration `20261014175831_closure_maintenance_rpc_permissions`. Effective production grants deny `anon`/`authenticated` and retain `postgres`/`service_role`. Four guarded production denial calls passed; scheduled jobs continued to succeed after the migration. Function bodies, search paths and cron definitions are unchanged. Original audit below retained as before-state evidence. Rollback: `supabase/tests/maintenance-rollback.sql` (restores the former exposure; emergency rollback only).

Read-only audit: 14 October 2026, project `kcuxyxqtfkxrbtmugjsn`. **No repair or maintenance function executed.**

`public.cleanup_expired_chat_messages(integer)` and `public.process_scheduled_chat_messages(integer)` are SECURITY DEFINER, owned by postgres, with empty search_path. Both live ACLs are `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. Neither checks the caller's role. The cleanup function removes expired content/attachment metadata; the scheduling function processes due messages using their owners' permissions. Anonymous/ordinary-account invocation must not be mistaken for permission to run maintenance.

Both cron jobs (`social24x7-cleanup-vanish-chat`, `social24x7-process-scheduled-chat`) are active and run as postgres. The original migration explicitly revoked execution from public/anon/authenticated; current grants differ. This audit does not establish when or why the grants changed. No worker was invoked to prove the finding, because doing so could alter real data.

## Proposed narrow repair (requires explicit shared-backend approval)

Re-check signatures, ACLs and cron owner immediately before applying. In a transaction with a five-second lock timeout:

```sql
begin;
set local lock_timeout = '5s';
revoke execute on function public.cleanup_expired_chat_messages(integer) from public, anon, authenticated;
revoke execute on function public.process_scheduled_chat_messages(integer) from public, anon, authenticated;
-- Retain postgres owner and existing service_role execution. Do not run functions.
commit;
```

Verify `has_function_privilege` is false for anon/authenticated and true for postgres/service_role; check cron remains active under postgres. Do not alter worker body, expiry policy, jobs, message records or Storage objects. Check current client call sites before approval; inspected original and new client repositories do not require direct maintenance-worker invocation.

Exact rollback to observed grants, if needed:

```sql
grant execute on function public.cleanup_expired_chat_messages(integer) to anon, authenticated;
grant execute on function public.process_scheduled_chat_messages(integer) to anon, authenticated;
```

Rollback reintroduces exposure and is for controlled recovery only. This proposal is not an applied migration.

## Other advisor results (not blanket exploit claims)

6 RLS-enabled/no-policy informational findings; 2 mutable-search-path warnings; 93 anonymous-callable and 114 authenticated-callable SECURITY DEFINER warnings; leaked-password protection disabled. Many callable business RPCs intentionally authorize in their bodies, so counts are **not** counts of proven vulnerabilities. Broader per-function audit remains; do not revoke every business RPC indiscriminately.

[Anonymous SECURITY DEFINER remediation](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [search-path remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
