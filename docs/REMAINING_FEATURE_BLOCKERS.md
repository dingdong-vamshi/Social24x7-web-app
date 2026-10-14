# Remaining gaps and acceptance blockers

## Current recovery status — 14 October 2026

**The current ledger below supersedes stale implementation/session claims in the retained historical table.** The historical section records earlier work and real earlier QA receipts; it must not be read as a list of newly failed production functions. This is not a full-parity release certificate, and local tests do not certify production writes.

Current ground truth: [original action inventory](WEBAPP2_ORIGINAL_FUNCTIONAL_PARITY.md), [Social recovery](WEBAPP2_SOCIAL_FULL_PARITY.md), [Seller recovery](WEBAPP2_SELLER_FULL_PARITY.md), [Creator recovery](WEBAPP2_CREATOR_FULL_PARITY.md), and [Team recovery](WEBAPP2_TEAM_FULL_PARITY.md). Source gaps closed in these ledgers are no longer “not ported” merely because an earlier row says so. Counts in prior documents are historical bounded inventories, not an exhaustive current total.

### Resolved ordinary-session claim

Normal production username login using the existing authorized **Arjun QA identity succeeds**; Seller/Creator owner access is available. Authorized **Admin login and application-detail reads also worked** in the earlier authentication investigation. A previous report of “no authenticated Partner/Admin application session” did not establish an application failure: the session/credential recovery path had not been followed. Do not request a new Supabase account or label the entire release blocked on that obsolete assertion.

### Exact remaining acceptance conditions

| Area | Exact current condition | Next safe step / release impact |
| --- | --- | --- |
| Employee Work session | Two QA B identities have VERIFIED memberships and linked confirmed Auth users. Their historical temporary credentials were deleted; exported password fields are redaction placeholders. One placeholder was mistakenly submitted and rejected. This is **not evidence that a valid password or Supabase Auth failed**, nor an RLS/routing rejection. Suspended/removed same-name identities are different accounts. | Existing authorized controlled Work session or approved private current credential source is required for employee live acceptance. Do not guess, reactivate, reset roles or create new users for proof. Owner/Creator/Admin QA proceeds independently. Exact IDs/statuses: Team ledger. |
| New recovery mutations | UI/repository contracts and isolated tests cover Social media/story/interactions/share, Seller catalog/affiliate/fulfillment/returns, Creator promotions and Team lifecycle. No fresh real business mutation is claimed by this pass. | Controlled data and appropriate authority are needed before genuine writes. Read-only production UI/screenshots can proceed. Do not submit real applications, approve employees/applications, send customer messages or move money just for QA. |
| Submitted LinkedIn and editable onboarding evidence | Existing approved QA identities correctly enter locked status/approved workspaces. No submitted LinkedIn application record was found in the prior read-only audit. | Separate test-data condition from browser login. Use existing authorized editable draft identity if available; otherwise retain isolated persistence/review/Admin mapping tests and accurately mark live submitted-record proof unavailable. No forced status changes. |
| Private evidence/media references | Some historical QA evidence/product records point to missing Storage objects. A successful authorized read/signing path cannot recreate absent objects. | Use existing valid controlled evidence for read verification; report missing objects precisely. Do not invent media or claim Admin approval evidence from nonexistent files. |
| Shared Storage residual | Approved generic branding INSERT and disabled generic UPDATE/DELETE repair is intact. Product-specific `creator_commerce_shop_media_seller_update` still has a weaker source `USING` condition than destination `WITH CHECK`. | Small reviewed repair/rollback and explicit production approval remain necessary. No policy mutation in this recovery. Independent frontend QA is not stopped by this policy review. |
| Admin decisions/audit history | Real Admin authentication/reads are available. Genuine decisions are not authorized as QA. Existing return-decision repeat/state safety and absent append-only full application audit history remain distinct backend limitations. | Preserve read-only Admin access and isolated decision/error tests. Review backend changes separately; do not fabricate historical events or execute refunds. |
| Product/money boundaries | Multi-store product save RPC selects an account storefront; unsafe ambiguous mutations remain disabled. Product save + metadata + media is a multi-step original contract, with explicit partial-success handling. Finance/Creator totals are estimates or recorded ledger statuses, not payouts. | Respect owner/version checks, currency separation and incomplete-data warnings. No unpublish/variant/provider/refund system is invented. |
| Full deployed acceptance | Current source recovery and automated checks do not prove every role/action or every responsive state in production. | Coordinator records the real SHA/deployment, safe read-only browser results and old/new screenshots. Upgrade only the exact verified action; keep live writes separately unverified. |

Original **Soon/placeholder** items are not current implementation failures: Seller Marketing/ratings/bundles/accelerator/opportunities/warehouses/managed fulfillment/automations/LIVE/Growth/Apps & Partners; persisted Social Highlights and dedicated repost/bookmark/edit/delete actions absent from the inspected UI; Creator campaign invitation/completion, payment collection and paid badge purchase. The module ledgers contain the exact source traces. Games/Wallet/Nearby/full buyer commerce remain outside the requested Partner recovery; Social is now explicitly in scope and recovered, not excluded with them.

Current aggregate: **588 tests / 49 files passed; TypeScript, lint and production build passed.** Recovered Seller includes dispatch/customer details, return category/value/count reporting, initial product metadata, draft resume, affiliate controls, real analytics charts/payment mix and finance estimates. Creator and Team gaps are reconciled in their ledgers. Authenticated production reads passed for Seller, Creator, Social, owner-Team and Admin. Employee access requires a current valid Work credential/session; historical redaction text is not a password. See `WEBAPP2_FINAL_CLIENT_ACCEPTANCE.md` for current bounded gaps. No production mutation acceptance is inferred from automated results.

## Historical sprint gaps — retained receipt, not current status

This is not a full-parity release certificate. “Not ported” means unfinished implementation, not an external blocker.

| Feature | Remaining issue | Type / next action | Severity |
| --- | --- | --- | --- |
| Employee invitation | Historical validator defect disproved; current syntax checks pass | Controlled employee identity/activation lifecycle acceptance; see SPRINT_TEAM_FINDINGS.md | P0 |
| Actual employee login/approval/revocation | No authorized active work QA session available; no real roles changed | Access/acceptance; sign in controlled work identity and test role matrix | P0 |
| Independent professional corrections after Creator approval | Standalone professional route implemented; no Creator approval reset | Live editable professional QA request required; approved professional reopening is not supported by current backend | P0 |
| Live Admin review/evidence decisions | Admin queues/signing/error/decision UI tested; controlled QA Seller evidence references missing Storage objects | Real controlled pending application with valid private evidence needed; no genuine approvals performed | P0 |
| Live Seller/Creator mutation acceptance | One own-store QA draft created/edited; two images attached/reordered; SEO saved with canonical readback | Publishing, fulfillment, returns and promotion mutations still require suitable controlled records | P0 |
| Admin return/refund review | Authorized read-only queue implemented; decision RPC has no repeat/state guard and changes commissions/creates refunds | Reviewed backend safety change needed before mutation controls; no money movement | P1 |
| Seller packing/return evidence upload | Packing uploaded-file flow implemented; Seller return evidence not authorized by buyer-only existing intent | Packing needs controlled order acceptance; Seller-specific return evidence needs policy decision | P1 |
| Shared Storage isolation / storefront logo and cover | Approved generic three-policy repair applied and all 34 policy definitions compared; no objects changed | Live owner upload/readback still pending; separate product-specific UPDATE source-path weakness remains. See WEBAPP_2_BACKEND_RELEASE.md | P1 |
| Product-specific SEO metadata | Implemented and saved on one controlled unpublished QA draft | Wider production use still subject to owner permissions and stale-version protection | P1 |
| Storefront traffic analytics | Actual event/order analytics integrated with real denominators and reporting windows | Does not prove complete tracking coverage, payment conversion or marketing attribution | P1 |
| Order date/value filtering | Server-side date/value/currency/status filters implemented and isolated tests pass | Final deployed interaction checks recorded in sprint handoff | P1 |
| Avatar/privacy editor | Own-account avatar/privacy implemented, account-switch and uncertain-result safeguards tested | Live privacy/avatar changes not executed | P1 |
| Full Creator product details | In-web details and promotion relation implemented; real read verified in production | Some existing product media objects are missing; fallback works, media repair not fabricated | P1 |
| Chat attachment upload | Implemented; one harmless QA image finalized and readable by both existing QA participants | Production readback/reload verified; wider MIME/size acceptance remains; no APK claim | P1 |
| Group creation/member details | Existing accepted-contact create/member RPCs integrated; picker opened/cancelled safely | Creation mutation and membership lifecycle unverified; group administration remains unfinished | P1 |
| Rich chat payloads | Poll/event/reaction interaction incomplete | Frontend gap; exact action/type inventory still required | P1 |
| Consumer order return submission | Buyer request/status/uploaded evidence integrated with actual eligibility and explicit review confirmation | Controlled delivered QA order needed; no genuine order, commission or refund changed | P1 |
| Company feed post media | Authorized metadata-backed signed/public media implemented | Live controlled employee session still required | P1 |
| Full Admin audit timeline | Latest review visible; current RPC overwrites latest fields and no append-only application review table found | Cannot reconstruct absent history; reviewed backward-compatible event logging proposal needed | P1 |
| Legacy product media editing | Existing replacement service supports product-media; legacy shop-media rejected | Backend compatibility; no unsafe rewrite of legacy paths | P1 |
| Fresh onboarding screenshots | Approved Seller/Creator status comparisons captured; fresh forms cannot be exercised with approved identities | Controlled unapproved QA identity; no forced status changes | P1 |
| Business inbox scope | Ordinary Seller inbox and employee-assigned/owner-supervision inbox explicitly distinguished | Live assignment/reassignment and Work revocation need controlled employee credentials | P1 |
| Comprehensive every-button/role acceptance | Regression and sampled browser cases do not cover every existing page/control | QA work remains; execute role/action checklist with controlled records | P1 |
| Actual installed APK | No device-level acceptance performed | Test device required; browser proof is not APK proof | P1 |
| Test-payment and buyer-KYC override tools | Old test-only operations change financial/verification records | Controlled QA policy/records required before exposing or executing | P2 |
| Automatic transfers/refunds, new providers, E2EE, agency | Not introduced | Separate product/provider/security decisions; ledger status is not money transfer | P2 |

Variants, Seller unpublish/archive and live remote KYC were not found as supported actions in the audited current Seller/Lifecycle UI. Do not invent them. Source paths and per-action qualifications are in COMPLETE_FEATURE_PARITY_MATRIX.md.
