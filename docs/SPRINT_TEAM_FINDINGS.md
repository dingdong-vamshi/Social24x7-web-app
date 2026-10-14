# Team / Business Work recovery sprint

Date: 14 October 2026. Project checked: `kcuxyxqtfkxrbtmugjsn` (active/healthy). The old mobile repository was read-only. This workstream made no production invitations, accounts, member/role/permission changes, chat assignments, messages, schema changes, or migrations.

## P0 invitation diagnosis: historical blocker corrected

The claimed current email-regex defect is **not reproduced**. The prior report confused escaped JSON display with the SQL function's actual string. This is not a `.test`-specific rejection, domain policy, or deliverability check.

Live function: `public.create_storefront_team_invitation(uuid,text,text,text,text,text,text,text,uuid,text[])`.
At `2026-10-14 09:49:20 UTC`, source MD5 was `cb45436cad3d51884b66817cb726803b`; a subsequent read in this sprint matched. The extracted email pattern is:

```text
^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$
```

Its UTF-8 hex is `5e5b5e405b3a73706163653a5d5d2b405b5e405b3a73706163653a5d5d2b5c2e5b5e405b3a73706163653a5d5d2b24`. The separator is `5c2e`: one backslash followed by a dot, not two backslashes. Twelve exact-pattern syntax cases passed, including ordinary `.com`/`.org`, a plus-tag subdomain address, `.test`, trimmed uppercase, and malformed-address rejection. This proves validation syntax only—not delivery, invitation insertion, activation, or a permissioned browser workflow.

Safe reproducible diagnostic (SELECT only, does not call the invitation function):

```sql
WITH definition AS (
  SELECT prosrc FROM pg_proc
  WHERE oid = 'public.create_storefront_team_invitation(uuid,text,text,text,text,text,text,text,uuid,text[])'::regprocedure
), pattern AS (
  SELECT (regexp_match(prosrc, $rx$normalized_email !~ '([^']+)'$rx$))[1] AS expression
  FROM definition
), cases(email, expected) AS (
  VALUES ('employee@example.com', true), ('employee@example.org', true),
    ('first.last+tag@team.example.co.uk', true), ('qa@example.test', true),
    (' USER@EXAMPLE.COM ', true), ('a.example.com', false),
    ('a@@example.com', false), ('a @example.com', false),
    ('a@example', false), ('a@example.', false), ('@example.com', false),
    ('a@example' || chr(92) || 'xcom', false)
)
SELECT email, expected, lower(btrim(email)) ~ expression AS accepted,
  encode(convert_to(expression, 'UTF8'), 'hex') AS pattern_hex
FROM cases CROSS JOIN pattern;
```

No backend repair is justified on this evidence. No migration approval is requested and no backend rollback is needed. If a different revision/environment later reproduces a literal double-backslash pattern, the minimal proposal would replace only that literal-dot token with `[.]`, preserving signature, security, grants and all other validation. Approval would require a captured pre-change function definition, its hash, the failing cases, and a rollback restoring precisely that definition; it must not be applied speculatively here.

## Existing backend lifecycle / authorization inspected

| Operation | Current source evidence | Live acceptance status this sprint |
| --- | --- | --- |
| Invitation | Authenticated caller; same-store `business_team_manage`; approved active store; role in same store, not archived/owner; permission catalog and no unauthorized permission escalation | Read-only source/syntax verified; no invitation created |
| Activation code | Hashed generated code, 24-hour expiry; resend resets attempts, expiry, claim/consumed/revoked state | Source verified; no code generated or consumed |
| Approve | Team-manager permission; only awaiting approval with linked Auth user | Source verified; no approval executed |
| Suspend/remove/reactivate | Team-manager permission, allowed status transitions, protected root owner; suspension/removal unassigns chats and removes old participant while retaining history/audit | Source verified; not a live revocation acceptance test |
| Assignment | Same-store verified assignee, linked work identity and reply permission; previous work participant removed; owner/customer retained | Source verified; no reassignment executed |
| Work access | Work identity from trusted Auth metadata; canonical context; verified assignee/monitor gates on inbox and message RPCs | Frontend denial/recheck regression-tested with controlled responses |
| Company feed | Verified work identity plus `business_feed_view`; own store's active products and owner's public posts | Source/bucket policies inspected; authorized worker media UI still needs live acceptance |

Uniqueness is enforced for lowercase login ID, per-store lowercase work email, storefront/Auth-user pair, work Auth identity, and store/employee ID. Invitation execution is granted to authenticated/service roles, not anonymous. No secrets, activation codes, auth tokens or personal chat records were read or recorded by this workstream.

Aggregate metadata found **two verified Work memberships**, one suspended and three removed, plus eight verified owner-personal memberships. Therefore “no verified workers exist” is not an accurate blocker. The real acceptance dependency is a **controlled, authorized Work credential/session and an approved disposable lifecycle test target**. Existing active identities must not be presumed to be QA accounts or changed for screenshots.

## Frontend repairs implemented

1. Invitation validation rejects multiple `@` signs and applies the existing database full-name length (2–100), while preserving legitimate domains including `.test`. It does not invent domain allowlists.
2. Missing/empty activation credentials no longer display success. Resend retains the requested member identity because the existing resend RPC returns code/expiry but no membership ID.
3. Business Work inbox copy distinguishes employee assignments from the ordinary Seller business inbox. Owner monitoring explicitly explains different counts and is not employee impersonation or access to personal chat.
4. Work inbox rows are scoped again to the verified context's storefront. Reply/resolve recheck current verified context, matching storefront/assignee and reply permission before the canonical RPC; backend authorization remains decisive.
5. Retry of an unchanged reply retains one UUID. The existing `messages_client_id_key` unique index prevents duplicate insertion. When a response is ambiguous, the browser confirms delivery only via an RLS-authorized canonical row matching conversation, authenticated sender, client ID and body. A missing/denied/mismatched lookup remains a failure. Successful resolve does not silently erase an unsent draft.
6. Work subscriptions use unique channel names, reconcile on subscription/reconnection, remove channels and suppress late callbacks on cleanup. Existing focus/online/periodic context checks remain.
7. Company feed renders store logo, product images, and public post image/video media, with readable loading/unavailable/retry states and responsive cards. Videos have controls and do not autoplay.

## Media security boundary

The feed RPC supplies paths, not signed URLs. Known `social-posts` and `shop-media` buckets are currently public; these use their established public URL behavior. Product covers resolve their actual `product_media.storage_bucket` through an authorized query rather than guessing from a cover path. Private `product-media` objects use a five-minute signed URL, renewed after four minutes while mounted. No denied private object is retried through a public endpoint. Arbitrary external URLs, traversal paths, query fragments, encoded/control-character paths and unknown buckets are not rendered.

A signed Storage URL remains usable until expiry even after Auth/session revocation. The UI clears protected Work content when context refresh confirms denial, but this is not a promise of instantly revoking a previously obtained URL. There is no local encrypted cache, new storage policy, public-bucket conversion, or new encryption claim. See [Supabase Storage download documentation](https://supabase.com/docs/guides/storage/serving/downloads).

## Verification and remaining acceptance

Scoped validation: **72 tests passed across five files**, TypeScript project build passed, scoped ESLint passed. New files: `src/features/team/sprint-recovery.test.ts` and `sprint-work-ui.test.tsx`. Existing Team, Work activation and Auth tests also passed. These tests use controlled responses and are **not** live parity proof.

New regression coverage includes representative email syntax; missing activation response; resend identity; storage path and private/public isolation; media failure/retry/video controls; stable message retry IDs; authorized canonical confirmation; denied/mismatched confirmation; unique reconnect/cleanup; revoked permission before sending; suspension clearing history; and unrelated-store inbox exclusion.

Full controlled lifecycle still to accept: invite → activate once/expiry/reuse rejection → awaiting approval → approve → Work login → assign → work reply/customer visibility → resolve → reassign/old-assignee denial → revoke permission → suspend/session loses access → authorized reactivation → remove/session loses access. Check company media at desktop/mobile widths with that same permitted Work session. Do not label any unexecuted step PASS. Parent sprint QA owns browser screenshots, live mutation approval, final matrix and deployment evidence.

Application rollback: revert only this sprint's Team/Work frontend changes in normal version control if needed; no data rollback or backend migration is involved.
