# Real backend QA matrix

Executed 13 October 2026 (UTC), against `kcuxyxqtfkxrbtmugjsn`, using two existing authorized QA identities. Credentials were recovered from authorized historical QA chats and kept out of source, screenshots and reports. Both identities currently have approved Seller and Creator access: neither is a buyer-only or unapproved-role test account.

## Automated checks

Build, lint and the complete unit/component suite passed locally. These tests use doubles where appropriate and are **not** substitutes for the live browser evidence below. Final test count and production verification are recorded in the release section.

## Executed live checks

| Check | Result | Evidence |
| --- | --- | --- |
| Correct project and same backend as mobile | PASS | Exact project reference checked against old mobile configuration; Auth and existing commerce/chat records present |
| Existing account login | PASS | Both QA accounts authenticated through the actual new web form after final Auth race fix |
| Existing mobile-code web login | PASS | Same QA identity authenticated on the existing deployed Expo web client |
| Rejected credentials | PASS | Fictional invalid account rejected by real Auth; stayed on login page with error |
| Refresh/session persistence | PASS | Authenticated deep routes and messages survived browser reload |
| Logout/protected routes | PASS | Sign out then revisit consumer chats redirected to login; signed-out Seller deep link also redirected |
| Workspace selection | PASS | Both accounts received their actual approved Seller/Creator choices, plus consumer access |
| Approved application cannot be overwritten by onboarding | PASS | Direct Seller onboarding route redirected to actual application status |
| Own Seller workspace | PASS | Own storefront, catalog and orders loaded; 4 existing products before QA draft creation, 24 orders |
| Cross-account private application | PASS | Account B selecting A's application returned zero rows |
| Cross-store team dashboard | PASS | B calling the existing team dashboard RPC for A's store was denied |
| Unrelated personal conversation | PASS | B selecting messages from a nonmember conversation visible to A returned zero rows |
| Creator Center | PASS | Overview, discovery, promotions, links, earnings, analytics and profile loaded without alert states |
| Seller navigation | PASS | Overview/products/orders/returns/logistics/finance/team/affiliate/analytics/storefront/discoverability/account health and Business Chat loaded |
| Application status | PASS | Seller and Creator status pages used current approved application records |
| Catalog validation/search | PASS | Blank save blocked by required fields; absent product search showed a real empty-result state |
| Catalog draft save | PASS | Saved one zero-stock, unpublished `QA-WEB-20261013` draft using the existing RPC; reload retained it |
| Product category bug | FIXED | Initial arbitrary category failed the live constraint; editor now selects only Wellness/Home/Travel/Everyday, then live retry passed |
| Read failure and retry | PASS | Browser deliberately blocked orders request; error and retry button shown; removing block and retry recovered live orders |
| Web → existing mobile-code web | PASS | Sent unique QA text through new UI; existing client's open conversation received it without reload |
| Existing mobile-code web → new web | PASS | Sent second unique QA text through existing client's UI; new web rendered it without reload |
| Canonical persistence | PASS | Two proof texts resolved to two distinct stored message/client IDs; refresh preserved history; second QA account saw both |
| Offline/reconnect | PASS | Browser network disabled: explicit Offline status; reconnect/reload recovered the saved message. No queued offline-send claim |
| Public links | PASS | Nine distinct public destinations visited, with headings and no not-found response |
| Responsive | PASS | Five core surfaces at 1440/1280/1024/768/430/390/360: 35 measured checks, no document-level horizontal overflow; desktop and mobile captures reviewed |

The responsive matrix covers landing, registration, Seller catalog, Creator discovery and an actual consumer conversation. This is not a claim that every possible record length or all onboarding combinations were visually tested.

## Not demonstrated / deferred

| Check | Result | Reason |
| --- | --- | --- |
| Real email confirmation for a newly registered account | BLOCKED | No controlled QA mailbox confirmation session; existing accounts reused rather than creating unnecessary Auth users |
| SMS OTP | NOT IMPLEMENTED | Phone provider disabled in existing Auth; user confirmed email/password now, email OTP later |
| Email OTP | NOT IMPLEMENTED | Future requested direction, not current login flow |
| Unapproved customer/Seller role denial | BLOCKED | Both available valid QA identities approved; did not change roles to manufacture evidence |
| New onboarding draft/upload/submission lifecycle | BLOCKED | Existing applications locked by approved status; did not overwrite KYC, bank details or application records |
| Professional Creator submission | BLOCKED | Conditional logic/unit coverage exists; no new controlled professional evidence submission |
| Suspended employee/assignment revocation | BLOCKED | No controlled suspended employee identity/work session; no permission mutations made |
| Admin-only action rejection with real session | BLOCKED | No new web Admin mutation surface; backend policy inspection is not a live rejection test |
| Session-expiration lifecycle | BLOCKED | Not waited through token lifetime; refresh/session-event behavior has component tests |
| Attachment authorization/expiry on real files | BLOCKED | Existing signed-URL implementation and tests; no personal attachment opened to manufacture evidence |
| Publish product / image upload / new Creator promotion | BLOCKED | Implemented existing contracts, but not exercised as live mutations in this run |
| Order fulfillment/returns/refunds/payout mutations | NOT IMPLEMENTED | Read-only web views; existing app remains operational source for those actions |
| Actual Android/iOS device or APK sync | BLOCKED | Existing Expo **web** deployment verified, not an installed APK/device |
| Group creation/management, rich-message creation, chat attachment upload | NOT IMPLEMENTED | Existing group/rich history can be rendered; text sending is current scope |
| True E2EE / durable encrypted message cache | NOT IMPLEMENTED | No custom cryptography or encryption claims added |

## Evidence and controlled production writes

Screenshots and FLOW.md: `/tmp/social24-7-web-final-proof/`. Missing required onboarding/OTP images are explicitly listed there as blocked or not implemented, never substituted with fixture screenshots. Chat proof text timestamps: `2026-10-13T17:52:04.878Z` and `2026-10-13T17:52:04.901Z`. Screenshots captured afterward show the persisted messages; the no-refresh observation occurred during the initial send checks.

Controlled production writes: normal QA Auth sessions/read markers, two clearly marked QA chat messages, and one clearly marked unpublished zero-stock product draft. The initial invalid category request failed atomically. No schema, RLS, Storage policy, Auth provider, role, approval, financial transaction or existing product was changed. No test record was deleted.

## Release verification

`npm run build`, `npm run lint`, and `npm test` passed: **73 tests across 9 files**. Vite reports a non-blocking 571 KB main-chunk warning; workspace/chat routes are lazy-loaded. No actual privileged-key token patterns were found in source or the production bundle; Supabase SDK terminology alone is not a secret.

Pushed implementation to `dingdong-vamshi/Social24x7-web-app`, `main`. The existing Vercel project `social24x7-web-app` deployed successfully and the production alias remains `https://social24x7-web-app.vercel.app/`. Only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` were configured. No custom domains were bound. The initial connected release passed production landing, real QA login, Seller overview/products/orders, Creator overview/discovery and persisted chat checks without page errors. Final UI copy/date polish does not change these backend contracts; the final release SHA and post-polish production screenshots are recorded with the external flow proof.

Security review is scoped, not a certification of the inherited backend. The read-only advisor audit also reported existing function-search-path warnings, broad security-definer execution grants and disabled leaked-password protection. These were not changed in this web task; appropriate backend-owner review remains necessary. Live isolation cases above passed, while employee, attachment and full signup lifecycle cases remain explicitly unverified.

Old repository baseline and final read-only check: branch `main`, clean, HEAD `e207f7526f140976630b92c09782a87998f6a8c6`. No old-repository commit, push or deployment occurred.
