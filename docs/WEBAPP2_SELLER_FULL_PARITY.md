# Seller action-level recovery

Original source was inspected read-only on 2026-10-14. Source root: `/Users/vamshipendyala/Library/Mobile Documents/com~apple~CloudDocs/Desktop/july28drchiag`. Target is the separate React/Vite repository. This inventory was recorded before implementation. Browser/deployment verification belongs to the coordinator and must not be inferred from source inspection.

Source abbreviations: `S` = `src/features/commerce/SellerStudioScreen.tsx`; `R` = `src/features/commerce/supabaseShopRepository.ts`; `N` = `src/features/commerce/seller-studio-navigation.ts` in the original app. New sources below are relative to the web repository.

| Original module / action | Original source | Existing backend | New implementation at inspection | Status / evidence |
| --- | --- | --- | --- | --- |
| Orders: list, refresh, status/date/value sort, details | S:1625; R:listSellerOrders | orders, order_items, order_fulfillments; signed-in RLS | SellerStudio Orders + sellerSprint filters | PARTIAL FUNCTIONALITY — dispatch-date and complete customer-detail parity not established |
| Orders: fulfillment status, carrier, tracking, package, note | S:2186 | existing fulfillment RPC in operations repository | CommerceOperations FulfillmentEditor | IMPLEMENTED BUT NOT LIVE VERIFIED — no fulfillment mutation in this recovery QA |
| Orders: packing/private evidence | original order/evidence components | begin_uploaded_commerce_evidence_capture; finalize_commerce_evidence_capture; private evidence service | PackingUpload, EvidenceList | IMPLEMENTED BUT NOT LIVE VERIFIED — upload not executed in production |
| Returns: list, status, reason/category/date/search/sort | S:1720 | return_requests | SellerStudio Returns status only | PARTIAL FUNCTIONALITY — missing date/reason/search/sort |
| Returns: details/evidence/review note/approve/reject/request information | S:1785–1797 | canonical review/evidence contracts | ReturnReview + EvidenceList | IMPLEMENTED BUT NOT LIVE VERIFIED — no real decision during QA |
| Return Settings: per-product window summary and support contact | S:1807 | products.return_window_days; storefront support fields | No dedicated route | MISSING |
| Products: separate Add/Manage routes, search/status filter | S:1334; N | products | combined Products page | PARTIAL FUNCTIONALITY — Add deep link missing |
| Products: draft fields, save, resume local draft | S:291–332,1334–1552; R:saveProduct | save_creator_commerce_product + product metadata | ProductEditor + ProductSeoEditor; no unsaved local resume | PARTIAL FUNCTIONALITY |
| Products: images upload/reorder/remove, publication | S:1505; R:publishProduct | product-media; update_creator_commerce_product_media; publish_creator_commerce_product | ProductMediaEditor + existing catalog | IMPLEMENTED BUT NOT LIVE VERIFIED — safety tests exist; no live publishing |
| Affiliate: enable/disable product promotion and commission rate | S:1823; R:1214 | save_creator_commerce_product | only exposed inside product editor | PARTIAL FUNCTIONALITY — dedicated original Affiliate controls missing |
| Affiliate: promotion records / Creator directory | original business directory and promotion contract | creator_product_promotions; approved counterparties | Affiliate + CounterpartyDirectory | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Logistics: overview, fulfillment, shipping status summaries | S:1860 | orders | generic Logistics orders view | PARTIAL FUNCTIONALITY — original submenu and summary missing |
| Finance: gross/delivered/commission/approved-return/estimated Seller amount | S:1882; R:622 | orders, commissions, return_requests, order_items | delivered totals and commission ledger only | PARTIAL FUNCTIONALITY — finance estimate/approved return summary missing |
| Analytics: views, visitors, product views, conversion, order totals | S:1875,2335 | storefront_events + orders | TrafficAnalytics + order status summaries | PARTIAL FUNCTIONALITY — original charts/payment mix not yet reproduced |
| Storefront: business profile/contact, images | S:1169 | storefronts + shop-media | StoreEditor + existing image workflow | IMPLEMENTED BUT NOT LIVE VERIFIED — storage issue tracked separately |
| SEO & AI: metadata, tags, discovery flags | S:2012 | storefronts/products metadata | StoreEditor + ProductSeoEditor | IMPLEMENTED BUT NOT LIVE VERIFIED — this is metadata, not AI generation |
| Operations: support contact, city/state, readiness | S:2114 | storefronts | StoreEditor exists, standalone Operations route missing | PARTIAL FUNCTIONALITY |
| Team: roles, invites, lifecycle, monitoring | S:1898 | team RPCs | features/team | PARTIAL FUNCTIONALITY — dedicated Team audit owns exact status |
| Business Chat / Creator Chats: separate authorized conversations | S:1910,1972 | business and seller_creator conversation contracts | existing chat + directory | PARTIAL FUNCTIONALITY — coordinator owns routing/action verification |
| Ratings, Bundle, Accelerator, Opportunities | N + S:1906 | none; explicit Coming Soon panel | absent menu entries | ORIGINAL APP PLACEHOLDER ONLY |
| Warehouses, Fulfilled by Social24 | N + S:1906 | none; explicit Coming Soon panel | absent menu entries | ORIGINAL APP PLACEHOLDER ONLY |
| Marketing Promotions/Campaigns/Programs/Shop Ads/Shop Page | N + S:1906 | none; explicit Coming Soon panel | absent menu entries | ORIGINAL APP PLACEHOLDER ONLY |
| Affiliate Automations, LIVE & Video, Growth, Apps & Partners | N + S:1906 | none; explicit Coming Soon panel | absent menu entries | ORIGINAL APP PLACEHOLDER ONLY |
| Account Health | N + S:1906 | original placeholder | web already reads verification + availability | ORIGINAL APP PLACEHOLDER ONLY in original; preserve the web's real verification overview |

No supported carrier booking, shipping-label purchase, refund execution, payment transfer, or advertising campaign mutation is invented from the original placeholder labels.

## Recovery implementation and verification

Implemented after the inventory above:

| Recovered original action | New implementation | Status and isolated evidence |
| --- | --- | --- |
| Open Add Product directly | `SellerStudio.tsx`, `/partner/seller/products/add` | IMPLEMENTED BUT NOT LIVE VERIFIED — route rendering test |
| Enter Brand, Tags, Search keywords, search title/description, AI discovery summary during creation | ProductEditor + `productSeo/saveProductSeo` | IMPLEMENTED BUT NOT LIVE VERIFIED — same original two-step catalog RPC + metadata update; owner/store/version predicates preserved |
| Resume unsaved new product text | `parity.ts` account+store-scoped draft; ProductEditor | IMPLEMENTED BUT NOT LIVE VERIFIED — reload/unmount test, malformed data and injected IDs rejected; images explicitly not persisted |
| Recover from partial metadata/media save | ProductEditor retains fields and backend product ID; clears local new-product draft after initial insert | IMPLEMENTED BUT NOT LIVE VERIFIED — failure/retry tests prove the same product ID is reused and success is not claimed |
| Original on-hold/pending/ready-to-ship/in-transit order queues | `orderQueues.ts`; SellerStudio | IMPLEMENTED BUT NOT LIVE VERIFIED — original payment-state grouping tested |
| Dispatch date range and dispatch timestamp | `repository.orders`, OrderRangeFilters, OrderRecord | IMPLEMENTED BUT NOT LIVE VERIFIED — earliest recorded shipped event, inclusive local end date; filters apply within 500 loaded rows, disclosed in UI |
| Customer display name/username and customer search | original `profiles!orders_customer_id_fkey` relationship | IMPLEMENTED BUT NOT LIVE VERIFIED — existing authenticated RLS, only display fields; no email/phone/address expansion |
| Return category/reason/date/status/search/value sorting | `repository.returns`, `filterReturns`, SellerStudio Returns | IMPLEMENTED BUT NOT LIVE VERIFIED — owner guard; original request/profile/item/product joins; value sorting requires a currency |
| Return buyer/product/category/requested value | `repository.returns`, SellerStudio Returns | IMPLEMENTED BUT NOT LIVE VERIFIED — exact owned-request IDs; no bulk unrelated customer lookup |
| Returned-product counts, approved/rejected metrics and ascending/descending count view | `groupReturnPerformance`, ReturnPerformance | IMPLEMENTED BUT NOT LIVE VERIFIED — filters applied before grouping, currencies separated, missing values marked incomplete |
| Return Settings / per-product windows / support link | ReturnSettings, `/orders/return-settings` | IMPLEMENTED BUT NOT LIVE VERIFIED — actual product rules and existing support fields; no new refund policy |
| Affiliate enable/disable and commission rate | AffiliateProducts / AffiliateProduct / `setAffiliate` | IMPLEMENTED BUT NOT LIVE VERIFIED — owner-scoped fresh read then original `save_creator_commerce_product`; 5–70% guard, duplicate-request protection, denial retains edits |
| Logistics submenu and operational metrics | LogisticsSummary + `/logistics`, `/logistics/fulfillment`, `/logistics/shipping` | IMPLEMENTED BUT NOT LIVE VERIFIED — real order statuses, no carrier booking claims |
| Operations support edit and readiness | SellerOperations + existing StoreEditor | IMPLEMENTED BUT NOT LIVE VERIFIED — existing contact/city/state and store fields; no verification/payout edits |
| Original finance gross/delivered/active commission/approved-return/estimated Seller amount | `repository.finance`, `finance.ts`, FinanceSummary | IMPLEMENTED BUT NOT LIVE VERIFIED — same existing tables; per currency, deduplicated items, zero-floor estimate; incomplete/oversized sources fail visibly |
| Daily traffic charts, exact table, daily visitors and payment-method mix | `dailyTraffic`, TrafficCharts, TrafficAnalytics | IMPLEMENTED BUT NOT LIVE VERIFIED — real storefront events and orders, local-calendar buckets, deduplication and qualifying-status tests; zero activity has zero-height bars |
| Original Coming Soon modules | `originalSellerPlaceholders` and dedicated panels | ORIGINAL APP PLACEHOLDER ONLY — 15 restored Soon destinations, plus retained existing real Account Health overview (original 16th placeholder) |

No backend schema, policies, migrations, payment, refund, fulfillment or application state was changed by this Seller implementation. Original repository was not modified. Existing Seller/Creator onboarding/authentication fields were not changed.

### Verification receipt (2026-10-14)

- `npx vitest run src/features/sellerSprint`: **53 tests / 4 files passed**.
- Expanded Seller regression (`sellerSprint`, commerce, operations UI, operations security): **94 tests / 7 files passed**.
- `npx tsc -b`: passed.
- Targeted ESLint for SellerStudio and sellerSprint: passed.
- All tests use isolated mocks/data; no real product creation, publication, promotion toggle, fulfillment, refund or return decision was performed.
- Coordinator owns build/deploy and actual old/new browser screenshots. These statuses must be upgraded only from its deployment/production evidence, not from these isolated checks.

### Exact acceptance distinctions

- Read screens and their safe filters can be verified with existing approved QA identities. Production writes remain intentionally unexercised; user forbids genuine QA business actions.
- Original unsupported Marketing campaigns, product ratings/bundles/accelerator/opportunities, warehouses, managed fulfillment, affiliate automations, LIVE & Video, Growth and Apps & Partners remain **Soon**. These are not missing implemented originals.
- Multi-store product mutations remain blocked because the existing canonical product-save service selects the account's storefront. The original client also assumes a single storefront. No guessed cross-store mutation is permitted.
- Search/dispatch/operational order queues and return filters operate within the explicit latest-500 loaded-record limit. Date/value/exact order-status filters execute server-side before the limit. Analytics/finance paginate and reject results exceeding their declared completeness cap.
- Product create + metadata + media is the original multi-step contract, not an atomic transaction. Partial success is identified explicitly; retry preserves the created ID. Browser draft resume applies only to unsaved new-product text; backend-saved drafts are in the shared catalog.
- Original analytics called a 14-day visitor count “monthly active” and grouped dates inconsistently around UTC/local midnight. The recovered UI labels the actual reporting period and uses one local-calendar definition; it does not fabricate a monthly measure.
- Original finance is an estimate, not a settlement balance. Original payment mix is a method count, not payment success. Both distinctions remain visible.
- Shared navigation, Social, Team, Creator Chats and actual production proof are coordinator/other-agent scope; this document does not assert those independently complete.
