# Original → Partner Web action inventory

Latest acceptance evidence and 611-test continuation: `WEBAPP2_LIVE_ACCEPTANCE_2026-10-14.md`. The inventory counts below are unchanged; historical no-mutation/test-total statements are not the latest acceptance status.

## Current implementation checkpoint

All recovery items below have now been implemented; the table is retained as the **before** inventory, not the current missing-feature list. Module ledgers describe the resulting code and isolated tests. Final integrated check: **588 tests / 49 files passed**, ESLint passed, TypeScript + production build passed. Non-fatal build warning: main bundle exceeds 500 kB. Current authenticated production reads and exact acceptance limits are recorded in `WEBAPP2_FINAL_CLIENT_ACCEPTANCE.md`.

Deduplicated inventory: **96 action groups**, not atomic buttons: Social 20 (18 supported, 2 original-placeholder groups); Seller 22 (17 supported, 5 placeholder groups); Creator 23 (20 supported, 3 placeholder groups); Team 31 supported. Raw ledgers contain 99 rows; exclude Seller Team, Seller Chat, and Creator shared-Social crosslinks already covered elsewhere. Do not add recovery tables again. All 86 supported groups have implementations, but this does **not** mean 86 live end-to-end passes. Some grouped writes remain isolated-test-only, some records are absent, and employee acceptance lacks a usable current credential.

Normal production Partner username/password login succeeded as authorized Arjun QA. Original deployed app retained its separate Arjun session. The employee export contained a redaction placeholder rather than a usable password; one rejected attempt is not evidence of a Work Auth regression. No passwords or tokens are included in these documents.

Release and fresh deployed proof will be recorded in `WEBAPP2_DEPLOYMENT_HANDOFF.md`, `WEBAPP2_FINAL_CLIENT_ACCEPTANCE.md`, and `PRODUCTION_PARITY_QA.md`. No original repository, DNS, schema, RLS, or production business data was changed during this recovery.

## Preserved before inventory

Recovery baseline: `7dbcb1d6d1cf2526390f32a4881fec3210afc652`, clean main on 14 October 2026. Original source is read-only at the iCloud `july28drchiag` repository. Original deployed UI was opened with its existing `arjunqa24` session. Production Partner retains the authenticated Admin session from the preceding authentication investigation. A missing browser session is **not** a current authentication blocker.

This is the coordinating inventory; module ledgers contain the individual source actions and their evidence. No navigation entry alone qualifies as verified functional parity. Mutation tests use isolated fixtures unless explicitly safe and authorized; no applications, approvals, refunds or employee reactivations are performed for proof.

| ORIGINAL MODULE | ORIGINAL ACTION | ORIGINAL SOURCE | BACKEND | NEW WEB IMPLEMENTATION | STATUS | EVIDENCE |
| --- | --- | --- | --- | --- | --- | --- |
| Seller navigation | Expand Orders, Products, Logistics, Marketing and Affiliate | `src/features/commerce/seller-studio-navigation.ts`, `SellerStudioScreen.tsx` | Existing per-page contracts, no new backend | `WorkspaceShell.tsx` currently flat; grouped navigation recovery in progress | PARTIAL FUNCTIONALITY | Source has nested supported actions plus explicitly labeled placeholders |
| Seller Social | Open same-account social after Business Chat | Original Social tab + Seller identity | Existing social RPCs/tables | Seller Social route exists; richer Social port in progress | PARTIAL FUNCTIONALITY | Original deployed feed/profile/followers opened as arjunqa24 |
| Creator Social | Open social profile from Creator Center | `CreatorCenterScreen.tsx` ProfileSection | Same authenticated profiles/posts/follows | Missing dedicated workspace navigation entry | MISSING | Original ProfileSection `onSocial` routes to social-profile |
| Creator dashboard | Filter reporting period | `creator-center-model.ts`, PeriodBar | Own creator_commissions | Current dashboard has no period selector | MISSING | Original six period options and model boundaries inspected |
| Creator discovery | Sort products recent/price/commission | `CreatorCenterScreen.tsx` visibleProducts | Existing approved product query | Search/category exist; sort missing | PARTIAL FUNCTIONALITY | Original compare sale/regular price, commission and updatedAt |
| Creator discovery | Show attributed orders | DiscoverSection | Own commissions plus order/product metadata | Earnings exists; discovery order tab absent | PARTIAL FUNCTIONALITY | Source `discoverTab` products/orders |
| Creator Collab | List active promotion-derived Seller relationships; open chat | CollabSection | creator_product_promotions | No dedicated Collab page | MISSING | No invitation/contract system in original MVP |
| Creator Payments | Display pending/eligible/paid commission; provider-unavailable notice | PaymentsSection, CollectPaymentModal | Own commission ledger | Earnings exists; dedicated provider-neutral page absent | PARTIAL FUNCTIONALITY | Original has no connected payout provider or actual collection mutation |
| Creator profile | Bio/avatar, application category/specializations/status | ProfileSection | profiles, own creator_applications, verification RPC | Basic profile and professional page exist | PARTIAL FUNCTIONALITY | Richer original identity fields inspected |
| Creator Badge | Explain optional paid entitlement and disconnected payment provider | BadgeModal | Verification profile status only | No equivalent information modal | MISSING | Original does not execute payment or confer verification |
| Team | Invite/activate/owner approve/custom role/suspend/reassign/monitor | TeamManagementPanel + teamRepository | Existing owner/Work RPCs | Existing functional port being audited | IMPLEMENTED BUT NOT LIVE VERIFIED | See Team ledger; do not classify as read-only from list screenshot |
| Social Highlights | Render New/highlight placeholders | Original social profile | No actionable create/open/delete contract found | Must remain honest original placeholder | ORIGINAL APP PLACEHOLDER ONLY | Original deployed New rendered non-interactive; source trace in Social ledger |

## Module action ledgers

- `WEBAPP2_SOCIAL_FULL_PARITY.md`
- `WEBAPP2_SELLER_FULL_PARITY.md`
- `WEBAPP2_CREATOR_FULL_PARITY.md`
- `WEBAPP2_TEAM_FULL_PARITY.md`

Counts and release status are finalized only after integration and browser verification. Existing historical parity matrices remain preserved, but their old claims of missing approved QA credential sources are superseded by the successful normal-login investigation.
