# Creator recovery sprint — 14 October 2026

## Delivered scope and evidence level

| Capability | Status | Evidence |
|---|---|---|
| Independent professional status for an approved Creator | IMPLEMENTED — parent browser/live read check pending | `/partner/creator/professional`; loads the existing approved Creator application, own professional request and canonical specialization policy using the signed-in account. |
| Professional correction for draft, rejected and more-information-required | IMPLEMENTED — LIVE MUTATION UNVERIFIED | Corrects only the existing `professional_verification_requests` row. Tests cover allowed/locked statuses, stale versions, ownership, confirmation and preserved edit state. No production submission, upload or approval was performed in this sprint. |
| Submitted / under-review / approved / suspended professional state | IMPLEMENTED — read-only | No owner correction action is exposed in these backend-locked states. Existing Admin feedback is displayed. The current Admin review transition does not support reopening an approved professional request for correction. |
| Creator in-web product details and media | IMPLEMENTED — parent browser/live read check pending | `/partner/creator/product/:id`; linked from Discover and Promotions. Full description, price, brand, attributes, tags, Seller, eligibility, return window and multi-image/video media. |
| Existing product/promotion relationship | IMPLEMENTED — LIVE MUTATION UNVERIFIED | Owner-filtered promotions show status, commission snapshot and canonical tracking URL. Create/reactivate uses the existing `create_creator_product_promotion` RPC. No product copy, ownership transfer or new attribution backend. |

No claim of VERIFIED PARITY is made for live correction uploads/submissions, review transitions or promotion mutations. Parent QA/deployment report is authoritative for the current deployed SHA and browser checks.

## Exact existing backend rules inspected read-only

Project: `kcuxyxqtfkxrbtmugjsn`. Inspected live policies and function definitions, not just old UI assumptions.

- `professional_verification_requests` owner SELECT is `owner_id = auth.uid()`.
- Owner UPDATE is permitted only when the old row is `draft`, `rejected` or `more_information_required`; the new state must be `draft` or `submitted`.
- `private.protect_creator_commerce_review_fields` preserves reviewer fields against owner edits. The new correction payload does not include reviewer or approval fields.
- `private.sync_creator_commerce_access_from_application` updates **only `professional_status`** for professional-request changes. The independent web flow never updates `creator_applications`, Seller applications or access rows. General Creator and Seller approval therefore are not reset by this correction path.
- `private.professional_request_ready` requires professional title, degree, institution, registration number, a matching Creator/category/specialization policy, a credential document and verification video. The UI reuses canonical mobile credential labels and the live policy instructions; no new licence policy was added.
- `private.link_creator_commerce_evidence` links existing owner professional documents to the request on submission. New uploads use the existing `uploadCommerceEvidence` contract and private `creator-commerce-private` bucket.

Before any correction upload or submit, the client verifies the authenticated identity, approved Creator application/access, unchanged professional request version, matching policy and editable status. The UPDATE additionally filters owner, ID, `updated_at` and permitted old status; a zero-row update is an error, not success. RLS/triggers remain authoritative for races and authorization.

## Old implementation reference (read-only)

- `src/features/creatorCommerce/RedesignedCommerceScreens.tsx`: existing professional fields and credential requirements; Creator-level approved/pending lock prevented an independent correction. The new page intentionally does **not** call Creator resubmission.
- `src/features/creatorCommerce/lifecycleRepository.ts`: private product media signing; legacy `shop-media` public URLs.
- `src/features/commerce/supabaseShopRepository.ts`, `getProductBySlug`: existing product descriptions, media and storefront relationship.

Old mobile repository was not edited. No backend schemas, policies, approvals, accounts, credentials or business records were changed by this implementation/audit.

## Security and UX

- No sensitive form draft is written to local storage, session storage or browser databases. Text edits stay in component memory. Uploaded evidence persists privately; the page explains that submission is required to link a replacement to review.
- Evidence inspection signs only a path already linked to the current owner's request; links expire after 60 seconds. Raw storage paths are not shown. A refreshed page produces fresh links.
- Signed private product media uses `product-media`; public URL generation is restricted to the existing legacy `shop-media` bucket. Unknown buckets are rejected. Failed/expired media has a reload action.
- Product details only query active, approved products under existing RLS. Hidden/deleted/unavailable products show an explicit empty state; historical promotion rows are not deleted.
- Product links include no applicant, account, payment or professional evidence data.
- Review confirmation is a separate step. Back to edit preserves fields. Loading, retry, errors, disabled uploads/submission and read-only status feedback are implemented.

## Tests and remaining live checks

Run `npx vitest run src/features/creatorSprint`: 24 tests across repository rules and status UI. Scope covers approved/pending/suspended locks, rejected/more-info/draft corrections, unchanged Creator approval write target, optimistic concurrency, missing required evidence, owner identity, stale no-row update, invalid product links, product eligibility and private-media URL handling.

Isolated browser QA is **LOCAL TESTED**: 12 screenshots outside Git in `/Users/vamshipendyala/Documents/Social24-7-Recovery-Sprint-2026-10-14/`, named `local-tested-fixture-professional-*.png`, with `CREATOR_LOCAL_TESTED.md` and `creator-fixture-results.json`. The exact component and real workspace shell/styles were exercised with only mocked Auth/professional services and fictional data. Rejected, more-info, under-review and approved were checked at 1440 and 390; confirmation, Back preservation and simulated submit were checked for both editable states. No overflow, browser errors or backend requests occurred. A genuine card-spacing issue was fixed and screenshots recaptured. This is not live mutation proof. Scoped lint, TypeScript and production build passed.

The currently approved professional QA account can verify the real read-only page but **cannot safely exercise correction writes**. Controlled QA needs an existing authorized draft/rejected/more-info professional request attached to an approved general Creator. The current Admin RPC does not support approved-professional → more-info reopening (approved review permits suspension, with a separate reinstatement path). Do not alter approval just to obtain a screenshot. The independent correction flow is for an approved general Creator whose professional request is already in an editable state; it does not promise corrections to approved professional credentials.

Still required for VERIFIED PARITY: private replacement document/video upload; correction submit; independent Creator approval re-read; Admin review; requester status refresh; product promotion create/reactivate and canonical attribution readback. These are verification gaps, not requests for a new backend design.

New professional applications/category changes are intentionally not invented here. This P0 recovery feature corrects an existing request tied to the approved Creator's existing specialization. General Creators without a professional request get an explanatory empty state.

Parent integration: import `ProfessionalVerification` from `src/pages/ProfessionalVerification.tsx`, mount `/partner/creator/professional` under the approved Creator guard, and add its Creator navigation entry. CreatorCenter handles `/partner/creator/product/:id` internally under the existing wildcard route.
