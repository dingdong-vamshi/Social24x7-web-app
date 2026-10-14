# Seller recovery sprint — 14 October 2026

Baseline: new web HEAD `ea60a51`; the old mobile repository was inspected read-only. Scope is Seller UI and a dedicated `src/features/sellerSprint` repository, not a new backend. This report supplements the existing 164-action matrix; it does not replace its acceptance ledger.

## Implemented in this sprint

| Action | Current result | Evidence boundary |
|---|---|---|
| Order date-range/value filters and sorting | Inclusive local calendar dates, exact minor-unit value ranges, selected currency, server-side filtering before the 500-row limit; invalid/reversed ranges retained with feedback | Repository and rendered-form regression; production browser read verification pending |
| Product-specific SEO | Brand, tags, search keywords, search title/description and AI-discovery summary; same existing product columns as old app | Owner check, whitelisted RLS update and `updated_at` optimistic conflict guard; metadata save is IMPLEMENTED — LIVE MUTATION UNVERIFIED |
| Storefront traffic/conversion | Actual `storefront_events` and `orders`, same 7/14/30-day window, complete 500-row pagination with 10,000-record safety ceiling | Real definition, no fixtures; production browser read verification pending |
| Packing evidence upload | Private uploaded-file intent → upload → finalize; clear ordinary-upload label, size/MIME checks, preserved entries on denial | IMPLEMENTED — LIVE MUTATION UNVERIFIED; no production upload was performed |
| Storefront logo/cover upload | BLOCKED — BACKEND | Existing Storage owner policy resolves the wrong `name`; narrow approval candidate below, not applied |
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

## Storefront image Storage defect — approval proposal only

Live `shop_media_owner_insert`, `shop_media_owner_update` and `shop_media_owner_delete` policies on `storage.objects` are permissive and targeted to `authenticated`. They compare storefront ID with:

```sql
(storage.foldername(storefront.name))[1]
```

That is the **storefront display name**, not the outer Storage object name. Normal display names therefore do not authorize their branding uploads. A specially formed display name could also produce unintended authorization; this is a pre-existing shared security issue, not a web-only input defect. The other insert policy allows only `storeId/products/productId/...` for specific product moderation states. Using that path for a logo would be an inappropriate workaround.

### Why not repair all three to an unrestricted owner prefix?

Simply changing the argument to `objects.name` would activate broad owner writes across `storeId/products/...`, potentially bypassing the newer product-state-specific policies because permissive policies combine with OR. The safe candidate below fixes only the branding insertion need, retaining all existing product policies and leaving general update/delete policy remediation for separately reviewed scope. Existing immutable/public image paths remain readable. No overwrite, deletion, product moderation or role expansion is introduced.

**Not applied; explicit approval plus isolated policy tests required.** Candidate changes only `shop_media_owner_insert` and allows owner uploads of new objects under `storeId/branding/logo/...` or `storeId/branding/cover/...`. A future frontend upload uses unique names and `upsert: false`; the owner-scoped storefront update then stores `logo_path`/`banner_path`. Existing bucket is already public; uploaded branding must be clearly disclosed as public. Do not upload private KYC/evidence there.

```sql
begin;
alter policy shop_media_owner_insert on storage.objects
with check (
  bucket_id = 'shop-media'
  and (storage.foldername(objects.name))[2] = 'branding'
  and (storage.foldername(objects.name))[3] in ('logo', 'cover')
  and exists (
    select 1 from public.storefronts as storefront
    where storefront.id::text = (storage.foldername(objects.name))[1]
      and storefront.owner_id = (select auth.uid())
  )
);
commit;
```

Roles, policy name and permissive mode remain unchanged. No UPDATE/DELETE permission is introduced; replacing a displayed logo would point to a new owned object and preserve the old object. Orphan lifecycle/cleanup is a separate operation, not hidden destructive cleanup.

### Exact policy rollback

The following restores the inspected prior INSERT predicate. It intentionally reproduces the old faulty binding for exact rollback; it is not a recommended final security state. Recheck live policy text before applying either direction, because concurrent migrations must not be overwritten.

```sql
begin;
alter policy shop_media_owner_insert on storage.objects
with check (
  bucket_id = 'shop-media'::text
  and exists (
    select 1 from public.storefronts as storefront
    where storefront.id::text = (storage.foldername(storefront.name))[1]
      and storefront.owner_id = (select auth.uid())
  )
);
commit;
```

Rollback changes future authorization only; it does not delete newly created public objects or reverse storefront pointers. Record any authorized QA paths and pointers before acceptance so an approved data restoration can be performed separately if needed.

### Required isolated tests and approval boundary

Before production: capture existing policy definitions, create disposable owner-A/owner-B/work/anonymous fixtures and exercise actual Storage policy evaluation. Owner A may INSERT A/branding/logo and A/branding/cover; reject B's prefix, missing prefix, other bucket, other asset kinds, work employee identity and anonymous access. Verify all legacy product-path approval/suspension denials remain unchanged, and owner B cannot update A's storefront pointers. Validate MIME/15 MiB bucket limits and public-read disclosure. Exercise explicit rollback, then confirm old policies exactly match their captured definitions. These SQL blocks are proposed, **not executed or certified**. An actual Storage upload acceptance case remains required after approval/deployment.

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
