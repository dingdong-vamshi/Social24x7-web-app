# Partner Web — live acceptance continuation

14 October 2026. Supersedes the earlier reports' blanket statements that no messages/draft saves were tested, no valid Admin session existed, Reels playback was untested, and a 390px viewport could not be verified. Historical receipts remain intact. This is **bounded acceptance evidence, not certification of every production action**.

Starting code: `8eac69c2d720e96d8185c7a4d4466fbf333abb27`, clean target checkout. Existing Vercel project and Supabase `kcuxyxqtfkxrbtmugjsn` retained. No old mobile repository edits, DNS changes, new project, authentication bypass, real application/approval, customer mutation, financial transfer, production message deletion, or shared-backend migration.

## 1. Identities and login

Capabilities checked against `creator_commerce_access`, application/storefront records and Auth metadata, not display names. All five ordinary QA/Admin emails are confirmed and not banned.

| Identity | Production login/session | Seller / Creator / Admin | Storefront / safe scope |
| --- | --- | --- | --- |
| Naveen QA | PASS, normal email/password, logout and re-login | approved / approved / no | Social24 Test Store; own unpublished draft, controlled QA chats, authorized reads |
| Yogesh QA | PASS, normal email/password | approved / approved / no | Yogesh QA Store; authorized reads and nonmember denial |
| Kavya QA | PASS, exact username `kavyaqa24` + password | approved / approved / no | kavya-qa-store; Creator/professional/Social reads |
| Arjun QA | PASS, retained normal-login IAB session | approved / approved / no | Arjun QA Store; controlled QA chats, Social reads/playback |
| Existing Admin QA | PASS, normal email/password from approved private reference | not applied / not applied / yes | Authorized application reads only, no decisions |
| Work Employee B | BLOCKED: no usable approved private password/current Work session | Separate Work identity, not personal commerce roles | `QA-B-B3C16B`, `qa.employeeb.b3c16b8789`, Social24 Team QA; verified, activated, approved |

The similarly named B in **Social24 Test Store** is suspended, and A is removed. They are not the active Work B above. No credentials are included here. Personal password exposed in chat was not used. Supabase dashboard login is not Partner login; a fresh browser origin/context lacking a session is not an Auth outage. IAB and Chrome maintained separate ordinary QA sessions for delivery testing.

## 2. Counts and read evidence

Original implementation inventory remains **96 deduplicated groups / 86 supported implementations / 10 original placeholder groups**. Seller has 17 supported + 5 placeholder groups; Creator 20 + 3; Social 18 + 2; Team 31 supported. These numbers are not live PASS counts.

For requested acceptance counts, the following are **read scenarios**, not whole feature groups: Seller **11** cumulative scenarios and Creator **8**, including the explicitly dated prior walkthrough. Shared chat is counted in both workspace summaries but is one shared test pair. Seller **2 new mutation scenarios** (unpublished draft edit/restore; shared Creator–Seller exchange); Creator **1** (same shared exchange). Social/personal chat has a separate two-message exchange. No live Team lifecycle mutation is certified.

| ID | Production read scenario | Actual evidence / scope |
| --- | --- | --- |
| S01 | Seller overview/store | Fresh Naveen: approved store, 6 products, 4 active, 24 orders; existing authoritative storefront |
| S02 | Orders/filter/detail | Prior 14-Oct Arjun walkthrough: 10 orders, Pending 8, details/carrier/tracking; no fulfillment mutation |
| S03 | Products/draft editor | Fresh Naveen Draft filter and existing designated QA draft; persistence in A03 below |
| S04 | Returns/settings | Prior walkthrough: empty returns and 7-day return window; no decision/evidence mutation |
| S05 | Logistics | Prior walkthrough: existing 8 / 0 / 0 / 1 metrics; no dispatch/carrier purchase |
| S06 | Affiliate | Prior walkthrough: 4 promotion records and 10% rate; no rate/status mutation |
| S07 | Analytics | Prior walkthrough: 14-day two orders and ₹1,198; no financial mutation |
| S08 | Storefront | Prior existing profile/editor reads; fresh approved store selection; no branding upload |
| S09 | Finance | Prior Arjun: ₹5,391 gross, ₹599 delivered, ₹179.70 commissions, ₹5,211.30 estimate; not payout balance |
| S10 | SEO metadata | Fresh draft product metadata opened, saved, reloaded and restored; no AI service call |
| S11 | Creator–Seller chat | Fresh 3-conversation Creator inbox and correct shared history; A04/A05 below |
| C01 | Dashboard/reporting period | Fresh Yogesh: 2 active promotions, 4 clicks, All time selected; earlier Arjun period proof retained |
| C02 | Discovery/sort/attributed orders | Prior 6 eligible products, price-high ₹900/₹599/₹450; Naveen 3 attributed orders |
| C03 | Promotions | Prior Arjun active promotion read; fresh Yogesh dashboard count; no promotion status mutation |
| C04 | Affiliate link/copy | Prior canonical tracked link copied; no purchase/attribution mutation |
| C05 | Earnings | Prior Naveen 3 reversed commissions ₹360; payable ₹0, not mislabeled as earnings available for payout |
| C06 | Profile | Fresh Yogesh and Kavya application category/profile/identity states; actual mobile layout checked |
| C07 | Professional status | Yogesh not applied; Kavya approved with inactive paid badge; verified medical Social name has Dr prefix |
| C08 | Seller conversations | Fresh Naveen sees 3 conversations, Arjun history, controlled A04/A05 delivery |

Earlier evidence is in `WEBAPP2_FINAL_CLIENT_ACCEPTANCE.md` and the module ledgers. A read pass does not certify all associated writes. Marketing/Live/Growth/integration/payment-provider placeholders remain explicitly unavailable, not invented services.

## 3. Fresh safe mutation ledger

Each chat was confirmed to contain **only Arjun and Naveen QA**, with the existing participants and correct context. Messages are visibly labeled QA and remain as evidence; none were deleted. Opening chats can advance the app's normal read state.

| ID | Role/action | Expected / actual | Backend readback | Proof / result |
| --- | --- | --- | --- | --- |
| A01 | Arjun personal chat → Naveen | Send one labeled message; received without manual refresh | `41fa20d4-f835-4e4d-ab47-baff81486363`, correct Arjun sender, one row | `personal-chat-naveen-received.jpg`; PASS |
| A02 | Naveen personal reply → Arjun | Reply received without manual refresh | `e419bd3c-1864-493e-aced-06bb2164e297`, correct Naveen sender, one row | `personal-chat-arjun-received.jpg`; PASS |
| A03 | Naveen unpublished QA draft brand | Save marker → reload → see persisted marker → restore original | Product `91fdf45f-1faf-44d7-8221-eab8a580b8c5`; brand original `Social24 Test Store`, temporary `QA acceptance A03 — restore after check`, restored original; status draft, price_minor 100, inventory 0 unchanged | `seller-draft-metadata-saved.jpg`, `seller-draft-restored.jpg`; PASS |
| A04 | Arjun Seller → Naveen Creator | One labeled message, recipient receives automatically | `c50a3b52-4da8-4523-883f-ec32dbaa8165`, Arjun sender, one row | `creator-seller-received.jpg`; PASS |
| A05 | Naveen Creator → Arjun Seller | Reply received automatically | `02361ae3-b5ba-4da5-a4a0-5c8f5b4755e2`, Naveen sender, one row | `creator-seller-two-way.jpg`; PASS |

Personal conversation `663b6f3a-3865-4663-a36c-a5fb9e78d050`; Creator–Seller conversation `c5fbf71a-c449-4587-8f51-264f35f97016`. The automatic updates were observed without pressing Refresh, but exact latency and WebSocket-versus-periodic-reconciliation attribution were not instrumented; do not claim a measured realtime SLA. Draft timestamps naturally advanced; other inspected values were retained. No publish, inventory/price update, new application or real customer chat was used.

## 4. Social, Team, Admin and isolation

| ID | Action / actual result | Status and limit |
| --- | --- | --- |
| L01–L04 | Naveen/Yogesh email, Kavya username, Admin email normal login; correct role surfaces | PASS; phone/reset-mail positive path not newly executed |
| SEC01 | Yogesh opens Arjun–Naveen conversation deep link | PASS: no history/composer; membership denial, not failed login |
| SO01 | Arjun Reels native Play; video time 0.116→8.981 seconds, paused false, error null | PASS actual playback for this clip; not all videos |
| SO02 | Kavya Social profile: Dr prefix, verified professional, 0 posts/1 follower/1 following | PASS; authoritative professional approval checked |
| SO03 | Feed/profile/comments/notifications/follower lists | Earlier authenticated production reads retained; no new public post/like/follow publication |
| SO04 | Stories | Composer/integration isolated tests retained; no active story or public QA story created, populated traversal not live-certified |
| R01 | Chrome actual viewport 390×844, document scrollWidth 390; Creator overview/profile mobile menu navigation | PASS; actual measured viewport, not merely requested screenshot dimensions; override reset |
| T01 | Naveen owner roster | PASS read: protected Owner verified, B suspended, A removed; owner 5 open/0 resolved/5 lifetime/3 waiting |
| T02 | Invitation/custom-role forms opened then cancelled | PASS UI only: correct fields, role choices and permission editor; no invite/role created |
| T03 | Suspended member filter + identity/effective permission expansion | PASS read: only B, explicit Work access disabled despite configured permissions |
| T04 | Supervision inbox and security audit | PASS list read: separate 6-row company scope; not ordinary/personal inbox; no reassignment, private customer reply or lifecycle action |
| AD01 | Authorized Admin dashboard | PASS: 8 Seller, 8 Creator, 7 approved/1 pending each; no decision |
| AD02 | Existing Arjun Creator details | PASS: legacy Instagram, manual-review disclaimer, review history and masked financial fields; screenshot does not prove new LinkedIn submission |
| AD03 | Private evidence opening | Not certified: observed opening state is not proof of authorized evidence bytes; no KYC screenshot disclosed |
| ON01 | Seller/Creator LinkedIn forms, URL validation, drafts, review/Admin mapping | ISOLATED TEST VERIFIED; existing approved accounts redirect to status/dashboard; no new application manufactured |

The Work identity would test assigned customer replies, company feed, denied finance/personal access and revocation, but its current secret/session is unavailable. Owner UI and 81 isolated Team tests do not substitute for live employee lifecycle acceptance. Team's original sections/contracts are implemented; **exact end-to-end equivalence is not promised without those remaining tests**.

## 5. Defects fixed and media findings

1. Broken Social images/avatars and failed videos lacked a consistent fallback. Added reusable image/video unavailable state and named-initial avatar fallback in feed/profile/story paths, preserving native controls and inline playback. Four new tests. The exact Arjun/Naveen avatar and two legacy post paths have no matching current Storage objects; an existing Hema avatar object does render. Original source uses the same bucket/path mapping. Missing bytes are not fixed by changing CSS or inventing replacement pictures. Migration as the historical cause is **not proven**.
2. Old lazy-loaded deployment chunks produced a generic failure. Added specific connection/deployment guidance, explicit Reload and unsaved-edit warning; no auto-reload loop. Added HTML/non-assets `Cache-Control: no-cache` while retaining asset caching and SPA rewrites. Five new tests. Existing stale tab recovered on reload; new boundary behavior is isolated-tested, not a deliberately broken production deployment.
3. Chrome's older QA tab stopped accepting automation input after viewport reset; a fresh same-origin tab worked with the existing session. This was not treated as an application code failure.

## 6. Messaging architecture / isolated prototype

See `MESSAGING_DEVICE_LOCAL_STORAGE_ARCHITECTURE.md`: text/payload in Supabase messages, media in private Storage, runtime React history, no durable device inbox/ACK found in the inspected mobile/web chat path. Read receipts are not durable delivery receipts. AI history/search/summaries and scheduling depend on cloud records.

Isolated encrypted IndexedDB adapter + in-memory queue implemented outside production imports. Fourteen tests cover persistence/reopen, logout locking, offline/reconnect, duplicates, lost ACK/response, wrong keys/identity/digest, group/multiple-device/sender copies, storage failure, expiry, revocation and reinstall recovery gaps. Not a durable sender outbox, real server, device enrollment, key-recovery service, attachment store or APK implementation. No production deletion or retention change.

## 7. Security and gates

Current project healthy; normal Auth works. Chat nonmember production denial and isolated authorization regressions pass. RLS enabled on inspected conversation/message/participant/attachment/scheduling tables is not an exhaustive policy certification.

**New unresolved finding:** two maintenance SECURITY DEFINER RPCs are executable by anon/authenticated without a caller-role check. They were never invoked for QA. Narrow revoke proposal/rollback in `MAINTENANCE_RPC_SECURITY_REVIEW.md`; approval requested, not applied. Existing Storage product source-transition weakness also remains under its separate reviewed proposal. Neither is masked by passing UI tests. Advisor counts include intentional callable RPCs and are not vulnerability counts.

No production schema/RLS/Auth configuration change in this continuation. Existing data unchanged except A01/A02/A04/A05 retained QA messages, ordinary QA read state and restored A03 draft metadata/timestamps.

## 8. Exact remaining categories

| Class | Issue / actual dependency | Resolver / next step / deferral |
| --- | --- | --- |
| B | Work employee login and lifecycle proof | User supplies current approved private secret or signs into `/business-login` as the exact active Work B; then test existing assigned-only scope. Do not guess/reset or reactivate suspended B. Can defer screenshots, not full employee certification. |
| B | Fresh onboarding and submitted LinkedIn live example | Controlled unapproved QA identity or existing legitimate submitted LinkedIn record. Exposed personal password not used; do not manufacture applications. Isolated mapping remains valid, live example deferred. |
| B | Real confirmation/reset email | Controlled inbox access and user-completed password change where required. UI/contract tests retained; real delivery/completion not certified. |
| B | Unique phone positive production login | Authorized identity with unique verified phone; shared legacy phone must fail closed. Email/username work; no identity guessing. |
| B | Private evidence and populated returns | Authorized safe evidence/return fixture and complete byte-access proof; no genuine KYC decisions/refunds. Isolated tests remain separate. |
| B | Maintenance RPC grants / product Storage source policy | Explicit reviewed shared-backend approval; then apply narrow transaction, verify permissions/cron and rollback readiness. Security exposure should not be silently deferred. |
| C | Multi-store product write | Canonical save API cannot unambiguously select store; current guard is deliberate. Approve backward-compatible backend contract before enabling. |
| B/C | Remaining live writes (publication, fulfillment, promotion/role/lifecycle/reassignment) | Explicit safe disposable fixtures/scope; isolated tests do not constitute live acceptance. Do not affect public listings, customers or approvals for evidence. |
| D | Missing historical photo/post bytes | Owner/backup provider must recover original bytes; graceful fallback shipped, loss cause unproven. Functional reads can continue. |
| D | APK and local-message retention | Coordinated mobile/backend/web release, device keys, media persistence and recovery; current isolated prototype is not deployed architecture. |
| C | Message retention, business audit, AI context, backup/E2EE | Product/security decisions and approved migration; no server deletion until satisfied. |
| E | Ten original placeholder groups / unconnected payment provider | Preserve honest unavailable states; separate future scope, not recovery defects. |

## 9. Verification / release

Before release: **611 tests across 52 files PASS; ESLint PASS; TypeScript + Vite build PASS**. Existing >500kB chunk warning remains nonfatal. New package `fake-indexeddb@6.2.5` is dev-only, audit returned zero vulnerabilities. Device prototype is not bundled by application routes. Deployment SHA/ID and fresh post-release screenshot receipt are recorded separately to avoid a self-referential commit hash.

Evidence directory (private, not committed): `/Users/vamshipendyala/Documents/Social24-7-Acceptance-2026-10-14`. Actual screenshots are shown inline in the final response. Historical screenshots and isolated LinkedIn fixtures are clearly distinguished.

**Partner verdict:** functionality implemented, specific live acceptance gaps remain; shared-backend security findings require approval/remediation before an unconditional security sign-off.

**Device-local messaging:** architecture and isolated prototype complete for the stated prototype scope, not a production migration.
