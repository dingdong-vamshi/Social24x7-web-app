# Webapp 2 focused closure — 14 October 2026

Baseline: `f0ac695bb6c0864bc77d47e559c75d4928483ce9`, existing Partner Web repository/project. No APK or DNS changes.

## Applied security repairs

| Repair | Before | Applied / production result |
|---|---|---|
| Maintenance EXECUTE | Both maintenance SECURITY DEFINER functions callable by anon/authenticated | `20261014175831_closure_maintenance_rpc_permissions`: only postgres/service_role retain EXECUTE. Four guarded real SQL calls denied under anon/authenticated. No worker body ran in those denial tests. |
| Product-media UPDATE source | Product UPDATE USING checked bucket/uploader but not source store/product/state | `20261014175833_closure_shop_media_source_policy`: USING now equals the already-reviewed WITH CHECK. All other 33 Storage policies unchanged. |

Maintenance definitions remain MD5 `badd5e7b3f5ffa5caf94b638f85943d6` and `7978ea94027b15581d84469324112f53`, with fixed empty search paths. Cron remains active as postgres; ordinary scheduled runs succeeded after the repair (18:05/18:06 UTC). No direct maintenance callers were found in either frontend or original Edge Function source. User-facing Seller/team RPC grants remain available. This is source/contract compatibility evidence, not a new APK device acceptance run.

Storage policy aggregate fingerprint: before `9634c380ea0ca9c2f251a3c4d37cddb4`, after `2530a5eb1428253ccc9f2b3a77dc28ee`. The previously applied generic branding repair was NOT reapplied in production. Only the product UPDATE source predicate changed in this closure. No KYC/chat/private-evidence policies changed, no existing objects changed.

Production Storage verification: 45 read-only evaluations of the actual live INSERT/UPDATE/DELETE expressions using an existing authorized QA owner, unrelated identity and anon. Own valid product/branding paths passed where intended; foreign-store and malformed paths failed. These were SQL policy-expression checks, **not HTTP upload/move/delete tests**. Source/destination state matrix and effective row-level INSERT/UPDATE/DELETE were exercised against the exact policy snapshot in isolated PostgreSQL: 104 checks passed, including rollback and drift guards.

Rollback files (emergency only; restoring them reintroduces the former exposure):

- `supabase/tests/maintenance-rollback.sql`
- `supabase/tests/storage-source-rollback.sql`

Both applied migrations use 5-second lock timeout, 30-second statement timeout and exact drift guards. Their local filenames match Supabase-assigned migration versions.

Security Advisor still reports pre-existing items outside these two repairs: 91 anon/112 authenticated SECURITY DEFINER exposure notices, two mutable-search-path notices, six RLS-without-policy informational notices and leaked-password protection disabled. An executable RPC notice alone does not establish vulnerability; caller checks require individual review. No blanket grants revocation was applied. See [advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Safe operational acceptance

`supabase/tests/closure-operations-fixture.sql` contains the captured production function bodies, selected table/default definitions and 112 CHECK/PK/UNIQUE constraints. All records used by `closure-operations.cjs` are synthetic. The fixture does not reproduce all triggers, RLS policies, auth provisioning, external payment or Storage HTTP services; results are intentionally limited to these RPC/constraint contracts. PostgreSQL fixture version: 14.19; production: 17.6.

| Feature / scenario | Role and fixture | Expected → actual / backend evidence | Classification |
|---|---|---|---|
| Employee lifecycle | Synthetic owners A/B and employees | Invite → hashed activation code → validated claim → awaiting approval → owner approval → verified; invalid identity/foreign owner denied; permission override, suspension/removal/reactivation and audit preservation passed | PASS isolated RPC contracts; employee-side live acceptance remains client-owned |
| Reassignment | Owner A, two synthetic employees, synthetic conversation | One assignee; duplicate assignment idempotent; former participant removed, new participant added; owner/customer and historic message sender retained; suspension clears assignment | PASS isolated RPC contracts; complete live employee RLS/supervisor session acceptance not claimed |
| Fulfillment | Owner A/B and synthetic COD/uncaptured-online order | Valid five-step progression persisted; skipped/duplicate/cross-store/anonymous/uncaptured transitions rejected; tracking trimmed; one fulfillment row; inventory reconciled once | PASS isolated RPC contracts; no real shipment |
| Returns/evidence | Owner A/B and synthetic return | Under-review then approval persisted; duplicate/invalid/unauthorized decisions denied; one pending external refund, no payment. Existing frontend tests cover authorized evidence-intent upload/signing/error handling | PARTIAL: decision contract PASS isolated; complete private-evidence HTTP upload pipeline not exercised |
| Publication | Approved/unapproved owners, synthetic draft and image metadata | Draft save/readback, category CHECK, ownership, image/inventory eligibility, active transition passed | PASS isolated RPC contracts; no public test product published |
| Multi-store boundary | Synthetic second storefront for same owner | Actual production `storefronts_owner_id_key` UNIQUE constraint rejects second owned store; product owner isolation passed | PASS current schema contract. RPC has no store-ID argument; existing UI multi-store fail-closed guard remains for future schema change |

47 new isolated operational checks passed. 104 isolated Storage checks passed. Maintenance fixture tests covered four denial and four trusted empty-worker executions. Existing UI/repository tests remain separate from actual database execution proof.

To repeat operational tests: create a fresh database named `closure_operations_<suffix>` on the explicitly disposable local socket/port, load `closure-operations-fixture.sql` with psql `ON_ERROR_STOP=1`, then run `node supabase/tests/closure-operations.cjs <socket> <database>`. Runner rejects non-local socket naming. Do not run fixtures, generic baseline or rollback files against production.

## Navigation/account implementation

- One shared configuration-driven portalled flyout; no inline children or persisted expansion state.
- All 21 existing Seller child links retained across Orders, Products, Logistics, Marketing and Affiliate. Existing Soon labels unchanged.
- Creator currently has no nested groups. All its existing direct routes remain direct; nested-Creator screenshot is N/A, not an invented feature.
- Mouse pointer entry opens; 220ms close grace supports crossing the gap; only one flyout; click/touch toggles; Escape/outside input dismisses; link navigation closes.
- Arrow keys/Enter/Space open, focus enters links; arrows/Home/End navigate; Tab leaves without trapping; Escape restores the trigger. Route/account/collapse/mobile state changes remount disclosure state.
- Fixed portal position follows anchor/scroll/resize and clamps to viewport. Off-screen mobile sidebar is hidden from keyboard focus.
- Seller/Creator account menus show My account, the other authorized workspace or existing onboarding/status action, and Log out. No current-workspace duplicate, Social, QR, chats/orders, website or use-another-account shortcut. Admin shows only explicitly approved commerce switches. Public Customer entry and all underlying feature routes remain unchanged.

Local browser: normal QA login succeeded; keyboard, mobile click navigation and account menu tested. All 1440/1280/1024/768/430/390/360 viewport measurements passed bounds/no-horizontal-overflow checks. Browser pointer-entry tests use secondary-button clicks on non-link targets to position the pointer without firing the left-click handler; unit tests separately cover hover-only entry/leave and switching. The automation API has no free-pointer-hover method, so slow manual pointer traversal is not independently certified.

## Deferred exactly as requested

Client employee Work live login; fresh onboarding/LinkedIn submissions; email/phone live acceptance; historical missing bytes; device-local messaging rollout/retention changes; original Coming Soon modules; Customer QR/APK pairing.

## Release verification

Production deployment and screenshots are recorded in the final closure receipt after deployment. Local checks before release: TypeScript/build passed, lint clean, 631 frontend tests passed (52 files). Existing bundle-size warning remains; no build failure.
