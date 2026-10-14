# Seller recovery sprint — 14 October 2026

Baseline: new web HEAD `ea60a51`; the old mobile repository was inspected read-only. Scope is Seller UI and a dedicated `src/features/sellerSprint` repository, not a new backend. This report supplements the existing 164-action matrix; it does not replace its acceptance ledger.

## Implemented in this sprint

| Action | Current result | Evidence boundary |
|---|---|---|
| Order date-range/value filters and sorting | Inclusive local calendar dates, exact minor-unit value ranges, selected currency, server-side filtering before the 500-row limit; invalid/reversed ranges retained with feedback | Repository/form regression and deployed reversed-range, real empty-result and reset checks pass; value/currency combinations remain isolated-tested |
| Product-specific SEO | Brand, tags, search keywords, search title/description and AI-discovery summary; same existing product columns as old app | Owner check, whitelisted RLS update and `updated_at` optimistic conflict guard; one controlled unpublished QA draft SEO save and canonical/deployed readback verified |
| Storefront traffic/conversion | Actual `storefront_events` and `orders`, same 7/14/30-day window, complete 500-row pagination with 10,000-record safety ceiling | Real definition, no fixtures; deployed read verified, tracking completeness not certified |
| Packing evidence upload | Private uploaded-file intent → upload → finalize; clear ordinary-upload label, size/MIME checks, preserved entries on denial | IMPLEMENTED — LIVE MUTATION UNVERIFIED; no production upload was performed |
| Storefront logo/cover upload | BLOCKED — BACKEND | Critical shared Storage isolation issue; full reviewed repair required, not applied |
| Seller return-evidence upload | BLOCKED — POLICY | Existing return-evidence creation requires the buyer, not the Seller; no permission bypass added |

### Existing contracts and important definitions

Read-only mobile source references:

- `src/features/commerce/seller-order-return-filters.ts`: calendar date ranges and value sorting.
- `src/features/commerce/supabaseShopRepository.ts`: `getSellerAnalytics` and product metadata update following the existing save RPC.
- `src/features/creatorCommerce/lifecycleRepository.ts`: uploaded-file evidence intent, private upload and finalization.

Live metadata inspection confirmed owner-controlled `products` metadata updates, server-controlled publication-state trigger, `storefront_events` read policy `can_manage_storefront(storefront_id)`, actual field names, private evidence bucket and evidence functions. Brand is NOT NULL with empty-string default; the new editor preserves that contract when clearing it. Tags and keywords are also non-null arrays. No schema, function, policy, bucket or genuine customer record was modified.

Traffic conversion deliberately retains the existing app's **qualifying orders / storefront views** definition. Qualifying excludes `draft`, `cancelled`, `refunded`; it does not mean successful payment. There is no assumption of one-to-one attribution, so the ratio may exceed 100%. No views yields “Not available”, not an invented zero. Unique visitors use known user ID, otherwise session key; IDs remain in memory and only aggregate counts render. Gross values remain separated by currency and are not profit or settlement. The selected window is not described as monthly-active users. Above the safety limit the query fails visibly instead of presenting a partial ratio.

Packing uses only `begin_uploaded_commerce_evidence_capture`, never `begin_trusted_commerce_evidence_capture`. `finalize_commerce_evidence_capture` accepts JPEG/PNG/WebP/MP4/QuickTime/WebM of 1–15,728,640 bytes. PDF is rejected even though the shared bucket accepts it for other workflows. Server intent paths are checked against the current user/order. Unknown finalization outcomes preserve uploaded objects, block blind retry and request an evidence-list refresh; deleting an object after a timeout could break a committed evidence record. Upload does not update fulfillment, inventory, commissions or payment state.

The inspected `private.create_commerce_evidence_capture_intent` permits packing for `can_manage_storefront(order.storefront_id)`. For `return`, it requires matching `return_requests.buyer_id = p_owner_id`, item/order and an open submitted/under-review return. A Seller upload cannot be mislabeled as buyer return evidence. Supporting Seller-authored return evidence needs an explicit existing-compatible role/kind decision and reviewed backend extension.

## Shared Storage authorization — critical unresolved issue

A pre-existing shared Storage isolation defect affects branding and generic asset write authorization. This is broader than a failed logo upload and blocks complete security acceptance. No cross-store mutation was attempted and no production policy was changed.

The earlier INSERT-only branding proposal is insufficient: a reviewed repair must cover INSERT, UPDATE and DELETE together while preserving the newer product-specific moderation restrictions and existing mobile contracts. Permissive policy composition must not create broader owner rights as a side effect. Exact policy details and the superseded proposal are retained in the private evidence directory, not repeated in this client-facing handoff.

After the user's preparation/validation response, the exact three-policy candidate passed 55 local PostgreSQL RLS checks: synthetic pre-fix reproduction, owner/non-owner/employee/anonymous boundaries, retained product-status restrictions, public reads, rollback/reapply and drift detection. The recommended change allows new owned branding inserts and disables only the faulty generic UPDATE/DELETE allowances; product-specific policies stay unchanged. This is NOT live acceptance: local PostgreSQL is 14.19, production 17.6, and the fixture is not the full Storage API/schema. Both directions guard the full Storage policy snapshot, including unexpected additional policies. Independent review also identified a separate existing product-media source-transition limitation; two tests explicitly reproduce it rather than claiming it is secure. The three-policy candidate does not change that product policy and is not a complete Storage security certificate. Private proposal, rollback and results are retained outside Git.

Required next step: approve that exact shared-backend repair, recheck policy drift, apply transactionally and verify a controlled Storage upload. The user has not yet approved the final reviewed three-policy SQL. This is a technical security defect requiring migration review, not an unresolved product feature decision.

## Safe browser acceptance plan

No production writes were performed by this workstream. Parent QA may perform only separately authorized controlled tests.

Read-only candidate check found existing `QA-WEB-20261013` (title `QA Web Draft — 2026-10-13`) still draft/draft, INR 1, stock/reserved 0, no order items and no media. Recheck owning account and current state immediately before any write. This is suitable for a controlled metadata/image test, not publication or genuine order testing. Do not infer authorization from its QA-looking name alone.

- `/partner/seller/products`: search SKU; target that row's `Edit`. SEO labels: `Product brand`, `Product search title`, `Product search description`, `Product AI-discovery summary`, `Product tags`, `Product search keywords`; action `Save product search metadata`. Record original metadata before an authorized test, reload to verify persistence, and separately restore only the test-edited metadata if authorized.
- `/partner/seller/orders`: expand `Order date and value filters`. Labels `Order date from`, `Order date through`, `Order currency`, `Minimum order value`, `Maximum order value`, `Order sorting`; `Apply date and value filters`, `Reset date and value filters`. These are read-only actions; exercise empty, reversed-range, invalid-currency and capped-result states.
- `/partner/seller/analytics`: `Traffic reporting period` and `Refresh traffic`; confirm actual read responses, reporting timestamps and no synthetic zero ratio when events are absent.
- Order details → `Add packing evidence` → `Packing evidence file` → `Upload packing evidence`. Only use an explicitly authorized QA-owned order and harmless synthetic image; no suitable order was mutated or certified here. Confirm evidence source is `uploaded_file`, private access and persisted record; never mark it trusted capture.

## Verification

Dedicated tests cover date inclusivity/invalid dates, cross-currency rejection, server filter order, SEO write whitelist/owner denial/stale updates/NOT NULL brand, traffic semantics/currency separation/incomplete-result denial, uploaded-only evidence intents/path scope/MIME restrictions and unknown outcomes, and rendered form draft retention. Exact final counts and production/browser evidence belong in the coordinating sprint QA ledger. New UI controls alone are **not** VERIFIED PARITY.

Workstream checkpoint: **20 new tests passed**; **61 total tests passed** across the new tests plus existing commerce, operations and operations-security suites (five files). TypeScript, scoped ESLint, production build and diff whitespace checks passed. Build retains the existing main-chunk size warning. No production/browser acceptance is inferred from this checkpoint; the coordinating regression pass must rerun after all concurrent edits finish.
