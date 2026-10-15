# Team operational backend — exact approval scope

Prepared 15 October 2026 for existing project `kcuxyxqtfkxrbtmugjsn`.
Status: **APPROVED AND APPLIED**, 15 October 2026. The user explicitly answered “Approve the reviewed backend activation.” The exact migration checksum below was rechecked before applying. Both scoped Edge functions deployed ACTIVE, version 1, with gateway JWT verification enabled plus their own caller Auth checks. No QA membership/customer mutation was performed.

## Proposed change

Apply `supabase/migrations/20261015063710_team_operational_contracts.sql` (SHA-256 `6a98aec083b22cde2b3b76264b7f4d52132e598d9c3c2195a95c852b8a873a0f`). This adds six public invoker RPCs and eight private, explicitly authorized helpers:

- Recorded historical distinct-conversation counts from retained assignment events and current assignments; no fabricated pre-audit history.
- Owner/current assignee/authorized supervisor rich-content reads, scoped to one active approved business and conversation.
- Product/order options and sharing by the verified current assignee with `business_share_products_orders`. Canonical records only; other customers' orders and other stores' products denied; server-derived attribution and retry IDs.
- Return options and decisions by the verified current assignee with `business_returns_refunds`. Mirrors existing Seller status/commission/refund-request bookkeeping. Approval queues `external_integration_pending`; cannot transfer money or mark a refund paid.

Deploy `team-media-link`: validate the Auth user, call the rich-content RPC **as that user**, validate exact conversation-prefixed finalized `chat-media` path, then use the service credential only to sign that exact path for 60 seconds. No arbitrary path input, public bucket, RLS bypass for payload reads, or service credential in the browser. A previously issued media link can remain usable for up to 60 seconds after revocation.

Deploy `team-invitation-email`: caller-authenticated invitation creation/replacement through the existing permission-checked RPCs; Resend delivery to the employee's work email. It requires `RESEND_API_KEY`, `TEAM_INVITE_FROM` and optional `TEAM_INVITE_REPLY_TO`. Without configuration it rejects before creating/replacing an invitation. No credentials, activation codes, provider errors or tokens are logged. Response is private/no-store. Provider acceptance is not claimed as inbox delivery.

## What this approval does NOT authorize

- No new QA employee, account activation, suspension/reactivation, role/permission edit, reassignment, invitation email, customer share or return decision for QA.
- No provider purchase, DNS change, new project, payment transfer or company-feed mutation policy.
- No application approvals, QR/APK work or modification of the original mobile repository.

## Backward compatibility and risk

No existing RPC, column, table grant, Storage policy, RLS policy or mobile contract is replaced. New function execution is denied to PUBLIC/anon; authenticated callers pass explicit authorization. Existing private-schema usage is already granted. New mutation APIs materially extend the actions available to **already permissioned** Work members, which is why approval is required.

Migration uses a transaction with 5-second lock wait and 60-second statement limit. Mutation APIs use NOWAIT on competing assignment/member/role/store locks; conflicting actions fail rather than continuing with stale authorization. Existing lifecycle functions acquire locks in different orders. Errors require refresh/retry, not success claims.

Read-only live inspection confirmed message/return triggers: vanish expiry, conversation update, customer reopen and return-status chat events. New shares retain those triggers. Full production trigger/RLS/HTTP/Storage execution is not certified by the isolated fixture.

Frontend can deploy independently: missing RPCs show pending backend activation; current-assignment counts remain intact; rich reads use the old participant-RLS path only when the new function is absent, never after authorization denial. Email falls back to explicit private delivery only before any email mutation; ambiguous delivery never silently creates another invitation.

## Tests and rollback

- 49 new isolated PostgreSQL checks: cross-store/customer scope, supervisor reads, path traversal, suspension, permission overrides, reassignment, attribution, distinct history, idempotency, return state, grants and concurrent lifecycle lock rejection.
- Existing 47 PostgreSQL lifecycle/commerce checks passed separately.
- 696 automated tests passed; build/typecheck, ESLint and Deno checks for both deployed functions passed.
- Local rollback and reapply succeeded. Rollback: `supabase/rollback/20261015063710_team_operational_contracts.sql`, SHA-256 `fb5bfc025038707f68247e72f4d8d1c4f57785aa3f481561a18b10f3c47d8f67`.
- Rollback drops only these added APIs/helpers, without CASCADE or deleting any records. Disable the two new Edge deployments separately. Already-recorded messages/decisions remain canonical history; rollback does not reverse business decisions.

## Approval requested

Approval was granted for this exact additive migration and these two scoped Edge deployments. Email sending remains disabled until an approved provider/sender is configured. No live QA mutations were included in this approval.

Post-apply catalog verification: all six public APIs are SECURITY INVOKER; all eight private helpers are SECURITY DEFINER with empty search_path; none allows anon execution. The two internal scope helpers are not directly executable by authenticated callers. The security advisor returned no finding naming these new functions; it still reports unrelated existing function/search-path and leaked-password-protection warnings, so this is not a blanket claim that the entire project has no security debt.
