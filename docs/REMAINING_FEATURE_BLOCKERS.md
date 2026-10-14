# Remaining gaps and acceptance blockers

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
| Storefront logo/cover upload | Existing Storage owner policy binds storefront display name instead of object path | Narrow branding INSERT proposal/rollback prepared; explicit migration approval requested, not applied | P1 |
| Product-specific SEO metadata | Implemented and saved on one controlled unpublished QA draft | Wider production use still subject to owner permissions and stale-version protection | P1 |
| Storefront traffic analytics | Actual event/order analytics integrated with real denominators and reporting windows | Does not prove complete tracking coverage, payment conversion or marketing attribution | P1 |
| Order date/value filtering | Server-side date/value/currency/status filters implemented and isolated tests pass | Final deployed interaction checks recorded in sprint handoff | P1 |
| Avatar/privacy editor | Own-account avatar/privacy implemented, account-switch and uncertain-result safeguards tested | Live privacy/avatar changes not executed | P1 |
| Full Creator product details | In-web details and promotion relation implemented; real read verified locally | Some existing product media objects are missing; fallback works, media repair not fabricated | P1 |
| Chat attachment upload | Implemented; one harmless QA image finalized and readable by both existing QA participants | Production frontend readback and wider MIME/size acceptance remain; no APK claim | P1 |
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
