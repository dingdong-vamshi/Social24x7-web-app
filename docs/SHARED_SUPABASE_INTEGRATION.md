# Shared Supabase integration

Audit date: 13 October 2026. This replaces the Phase 1 mock-only architecture for production routes. The latest client-facing name is **SOCIAL 24-7**; historical repository, domain and database identifiers remain unchanged.

## Project and browser configuration

Both web and the existing mobile application target `kcuxyxqtfkxrbtmugjsn`, region `ap-south-1`. The connected project was verified with `get_project` as `ACTIVE_HEALTHY`, PostgreSQL 17.6. The production schema and function definitions were inspected read-only before implementing commerce.

The browser configuration is in `src/lib/supabase.ts`:

- `VITE_SUPABASE_URL`: expected project API URL. The client refuses a different project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: browser publishable key, preferred.
- `VITE_SUPABASE_ANON_KEY`: compatibility alternative for the existing public anon key.

No key values belong in this document. Never put service-role keys, database passwords, Management API tokens or provider secrets in any Vite environment variable. The configured client rejects secret/privileged keys. Missing configuration produces an unavailable state and never selects mock repositories.

One Supabase Auth session is shared across public, Partner and consumer routes. `AuthContext` loads the existing `profiles` row, `get_my_creator_commerce_access()` and owned storefronts. Workspace access derives from server records, never user-editable metadata or local preview approval flags. Local Auth session persistence is distinct from storing commerce, KYC or chat data; commerce query results stay in memory.

## Existing mobile references reused

The old repository was treated as read-only:

- `src/features/commerce/supabaseShopRepository.ts`: storefront ownership, product catalog, orders/fulfillments, returns and commission records.
- `src/features/creatorCommerce/lifecycleRepository.ts`: discovery eligibility, canonical promotion creation and private product image handling.
- `src/features/creatorCommerce/creator-center-repository.ts`: promotion/commission relationships and Creator identity.
- `src/features/creatorCommerce/CreatorCenterScreen.tsx`: `/store/:storefrontSlug/product/:productSlug?ref=:trackingCode` affiliate destination.
- `src/features/teamManagement/teamRepository.ts` and `types.ts`: team dashboard RPC, separate work identities and effective permissions.

Legacy mobile mock fallbacks were not copied. No new commerce tables, approval rules, role model or attribution engine were introduced.

## Live commerce bindings

The production Seller and Creator pages import `src/repositories/commerce.ts`. They no longer import `repositories/mock`, fixture charts, hardcoded people, static financial balances or fabricated growth percentages.

| Web capability | Existing backend source | Behavior |
| --- | --- | --- |
| Seller storefront | `storefronts`, filtered by `owner_id` | Actual owned stores and verification state; in-memory store selection |
| Catalog | `products`, `product_media`, filtered by selected `storefront_id` | Latest 500 products; title/SKU search, status filters, actual prices and inventory |
| Product save | `save_creator_commerce_product` | Existing approved-Seller and ownership checks; new products remain drafts |
| Product publish | `publish_creator_commerce_product` | Explicit confirmation; existing title/SKU/price/inventory/image checks |
| Product images | Private `product-media`; `replace_creator_commerce_product_media` | Appends images while preserving existing ones; JPEG/PNG/WebP, 10 MiB and 10 images maximum; existing private paths only |
| Orders/logistics | `orders`, `order_items`, `order_fulfillments` | Latest 500, real statuses, payment state, line items, carrier and tracking details |
| Returns | `return_requests` | Latest 500 requests, reasons and review notes; read-only |
| Seller finance | Owned-store orders and `creator_commissions` | Delivered order values by currency; recorded commission rows; no synthetic settlement balance |
| Seller analytics | Loaded order records | Real counts by current status, clearly bounded to latest 500 |
| Team | `get_storefront_team_dashboard(target_storefront)` | Server permission check for `business_team_manage`; actual identities, status and effective permissions |
| Creator discovery | `products` + `storefronts` + `product_media` | Active, approved, promotion-enabled, in-stock products; latest 80 |
| Creator promotion | `create_creator_product_promotion(p_product_id)` | Server checks Creator approval and product eligibility; creates or reactivates canonical record |
| Creator links | `creator_product_promotions`, filtered by `creator_id` | Actual code and established product destination; clipboard result/error shown |
| Creator earnings | `creator_commissions`, filtered by `creator_id` | Latest 500 rows; each ledger status totaled separately; no invented payout balance |
| Creator click counts | `creator_promotion_clicks` | Exact count scoped to loaded promotion IDs |
| Creator profile | Existing profile and commerce-access records | Current account identity and server approval statuses |

Affiliate links open the existing application at `https://vamshi-superapp-drchirag-social24x7.vercel.app`, because this web release does not implement a duplicate consumer product/checkout route. It uses the same canonical product slugs and tracking-code parameter. Missing destinations and inactive promotions cannot be copied as active share links.

The existing product-save RPC selects the owner's storefront internally with `limit 1`. Web catalog editing is therefore gated when multiple owned storefronts are returned, avoiding ambiguity or modifying the wrong store. Reads still support selecting each owned storefront. No RPC signature was changed.

The commission schema has integer minor-unit values but no per-row currency column; displays retain the existing application's INR convention. The read-only currency audit confirmed every current product and order is INR. Order and product amounts nevertheless use their actual currency field and preserve two decimal places. Order totals are never added across currencies. Product form amounts use exact decimal-to-minor conversion and reject sub-minor precision instead of silently rounding prices or commission rates.

## Authorization and security evidence

Read-only checks against production confirmed RLS enabled on all ten commerce tables used here: `storefronts`, `products`, `product_media`, `orders`, `order_items`, `order_fulfillments`, `return_requests`, `creator_product_promotions`, `creator_commissions` and `creator_promotion_clicks`.

The browser sends the signed-in user's public-client session. Every Seller read also carries the selected owned-store filter; Creator reads carry `creator_id`. The app clears results when account/load identity changes and ignores stale responses. The UI is an additional guard; database RLS and checked RPCs remain authoritative.

The existing `save_creator_commerce_product`, `publish_creator_commerce_product`, `create_creator_product_promotion` and `replace_creator_commerce_product_media` RPCs currently have `anon` execution grants. Their inspected bodies reject unauthenticated users and enforce the appropriate approval/ownership condition. `get_storefront_team_dashboard` denies `anon` execution and checks effective team permissions internally. These existing grants were not modified; they remain part of the backend security review rather than being silently weakened or rewritten.

Private product images receive 15-minute signed URLs. Existing `shop-media` is a public bucket and retains its existing public URLs. Private media is never converted to permanent public URLs. Failed uploads before attachment clean up only the new objects uploaded by that request. After an attachment RPC is dispatched, an ambiguous network outcome preserves uploaded objects because deleting them could break a committed media row; unreferenced uploads may need later reconciliation. Existing image metadata and cover selection are preserved. Files are not treated as uploaded simply because they were selected. If product details save but image attachment fails, the form explicitly reports partial success and reuses the saved ID on retry.

No schema, RLS, Storage bucket permissions, Auth providers, Edge Functions, financial records, team permissions or mobile code were changed by the commerce workstream. No user credentials or production customer data were added to source or tests.

## Explicit limits

- Orders/returns are live read-only views. Fulfillment transitions and return/refund decisions remain in the existing Seller application. The existing `seller_update_creator_commerce_fulfillment` RPC was inspected; delivery and cancellation also mutate inventory and commissions, so it was not added as an unverified web money-adjacent operation.
- No payout, refund, checkout/payment capture, subscription billing, courier booking or artificial settlement computation is exposed.
- Team identity management and work-credential activation remain in the existing application. The dashboard displays the real permission model without inventing personal-login employee access.
- Storefront edits, profile edits and advanced SEO/AI generation are not implemented here. The views show actual stored fields and explain where changes remain available.
- Business Chat access and work-assignment behavior are documented separately in `CHAT_SYNC_IMPLEMENTATION.md`.
- Tables have explicit latest-record limits displayed in the UI. They are not presented as unlimited all-time analytics.

## Verification status

Twenty-one focused automated tests pass for ownership/filter scoping, eligibility, canonical RPC selection and error propagation, product validation/exact minor units, upload prevalidation, bounded click-count queries, valid affiliate destinations, separate commission statuses, stale-account isolation and retry behavior. TypeScript and scoped lint passed after the independent commerce review.

Read-only production metadata, live function bodies, grants and Storage limits were checked. The coordinating QA agent subsequently authenticated using existing authorized QA identities and verified Seller/Creator routes loaded actual existing records without alerts. A live product draft save and refresh also passed: SKU `QA-WEB-20261013`, Everyday category, zero inventory, unpublished. Image upload/publication and Creator promotion mutations remain unverified. See `REAL_BACKEND_QA_MATRIX.md` for final route-level evidence and remaining cases.

The first authorized draft-save attempt exposed the existing `products_category_check`: free text was rejected and no product was created. A read-only inspection confirmed the allowed categories are exactly Wellness, Home, Travel and Everyday. The editor now uses a labeled select and validates this list before RPC dispatch. Existing title (2–180), slug (2–63), SKU (80) and description (180/8,000) limits are also enforced. Three regression tests cover the category restriction, readable server-error fallback and length constraints. Final retry results are recorded in the QA matrix; this document does not infer successful persistence from passing unit tests.

Anonymous HTTP checks using the configured public key returned HTTP 200 with zero rows for the exact nested order and promotion queries. The product query returned HTTP 401 / `42501` because the existing anonymous policy cannot execute `is_creator_commerce_admin`; no product records were exposed. Product queries in the web application are authenticated-only. Authenticated browser reads subsequently passed as described above.

### Independent commerce review

The review confirmed: status totals retain reversed/cancelled commission entries separately; delivered order value is not labeled revenue or a payout balance; no fulfillment, return, refund, payout or team-role mutation was added; multiple-store editing remains gated because the existing save RPC chooses the account storefront internally; account changes immediately hide stale request data and late responses cannot overwrite the new account. It also corrected exact decimal conversion, rejected invalid images before a product save, and batched click queries to avoid oversized REST URLs for large Creator accounts.

Current Supabase JavaScript [select documentation](https://supabase.com/docs/reference/javascript/select) and [RPC documentation](https://supabase.com/docs/reference/javascript/rpc) were reviewed. The changelog was fetched; the upcoming legacy TLS cipher retirement does not change the modern-browser query/RPC contract used here.
