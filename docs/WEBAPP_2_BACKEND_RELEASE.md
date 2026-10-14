# Webapp 2 backend release and security triage

14 October 2026 · project kcuxyxqtfkxrbtmugjsn · PostgreSQL 17.6.

## Deployed and read-verified

- Storage: repair_shop_media_branding_owner_policies changed exactly three generic policies; 34 total remain, other 31 unchanged. Owner-only new branding uploads allowed, faulty generic UPDATE/DELETE allowances disabled. No files deleted/rewritten. Exact proposal, 55-check isolated report, full drift guard and emergency rollback preserved in the private Recovery Sprint directory.
- Auth: four exact redirects and strong new-password character policy; see SUPABASE_AUTH_CALLBACKS.md.
- Migration partner_web_auth_and_identity, local source 20261014114914_partner_web_auth_and_identity.sql. Preflight found no conflicting names. Five-second lock wait / thirty-second statement timeout. Adds private limiter, service-only identifier resolution, authenticated personal discovery/request wrappers and verified-Doctor presentation. Public entrypoints are INVOKER; privileged helpers stay private with fixed search paths and explicit grants.
- Edge partner-login version 1 ACTIVE, deployed SHA bea45681a99558554052602814fd9e4f2897d1e982c762a5a177eca9610ab707. Gateway JWT check is intentionally off for password login; body privately resolves an eligible identity and verifies its password through Supabase Auth before returning tokens. No service key or email lookup result reaches clients.

Identifier lookup is exact, case-normalized and ambiguity-safe. Limits: 120/min global, 30/15min per address hash, 8/15min per identifier. Four-KB body cap and generic delayed failures. Direct email login retains Supabase Auth's own limits. Global limits can reduce availability under abuse; this is not comprehensive bot protection.

Personal discovery excludes self, private/undiscoverable/Work/inactive targets and blocked pairs. Consent is required; existing conversation RPCs are reused. A narrow trigger prevents pre-accepted INSERT and participant/ID rewriting. The original flaw was reproduced only locally. Business Chat contracts are unchanged.

Doctor presentation requires current Creator/professional approval plus an approved matching medical credential request. Legal/profile names are never rewritten. No medical-registration check is fabricated.

## Verification

- 51 checks passed on synthetic isolated PostgreSQL 14.19, not a full production clone: privacy/grants, ambiguity, quotas, consent forgery, immutable identities, reuse, blocks, revoked/unapproved/nonmedical Doctor cases.
- Deno check and ten isolated Edge-handler tests passed.
- Live unknown synthetic identity returned generic HTTP 400; preflight 204. Limiter readback confirmed the request reached the resolver. No real user's password attempted.
- Live ACL readback: no anon execution on new functions; resolver service-only; limiter RLS and consent trigger enabled.
- Existing open_personal_conversation, accept_personal_message_request and review_creator_commerce_application hashes identical before/after.
- No production applications, approvals, rejections, bank changes, chat messages, KYC uploads or financial operations performed.

## Remaining risks — not an all-clear certificate

| Finding | Assessment / action | Urgency |
| --- | --- | --- |
| Product-specific Storage UPDATE source-path transition | Separate unchanged weakness reproduced in prior isolated tests. Outside approved generic three-policy repair; needs its own exact review/approval and regression. | P1 release acceptance blocker |
| 93 anon / 114 authenticated executable public DEFINER warnings | Unchanged counts. Inspected payment-test helpers require authenticated commerce Admin and test mode. Review helper checks Admin/state/readiness. Samples do not audit all functions; blanket revocation unsafe. | Further per-function audit |
| Two mutable trigger search paths | private.touch_updated_at and public.notes_tasks_entries_set_updated_at are invoker triggers assigning NEW.updated_at = now(); no dynamic SQL/data lookup. No escalation demonstrated. | Low, hardening open |
| Leaked-password screening disabled | Dashboard requires paid Pro+; no upgrade purchased. Strong character policy is not equivalent. | Open hardening |
| Six RLS/no-policy notices | Five existing plus intentionally private partner_request_limits with no anon/auth table privileges. New limiter should have no client policies. | New notice expected |
| Missing old media/evidence | Earlier logs: 318 NoSuchKey errors. Policies cannot recreate missing bytes; no fake evidence supplied. | Affected-record acceptance blocker |
| Performance | Earlier scan: 142 unindexed FKs, nine auth-initplan and 21 multiple-policy findings. No blanket index/schema changes. | Measure before remediation |
| Realtime service incident | Provider status was monitoring latency; project-specific impact and live two-account delivery not established. | QA caveat |

Admin flow SOURCE-TRACED: draft RPC saves authoritative JSON; submit methods upsert the same owner record to submitted; Admin reads those tables excluding drafts; review RPC checks Admin/state/readiness and updates authoritative access. Added memory-adapter submission-to-Admin-detail test; NOT full PostgreSQL lifecycle integration or a real review decision test. Read-only live counts found one submitted Seller and one submitted Creator; no account-bound Admin UI session used this run.

## Incident rollback

Roll frontend to c055fd285d475d943894a40245b7797ccf38f408 and disable the new Edge Function. supabase/tests/partner-release-rollback.sql revokes new APIs without deleting records. It retains the consent guard to avoid restoring the proven flaw. Check live definitions for drift before rollback. Storage's original rollback restores a vulnerability and is emergency-only.

References: [Definer exposure](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [Search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [Password security](https://supabase.com/docs/guides/auth/password-security).
