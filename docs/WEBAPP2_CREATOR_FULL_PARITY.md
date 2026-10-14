# Webapp 2 — Creator functional parity

Original inspected read-only: `src/features/creatorCommerce/CreatorCenterScreen.tsx`, `creator-center-model.ts`, `creator-center-repository.ts`; current web `src/pages/CreatorCenter.tsx`, `features/creatorSprint/CreatorProductDetail.tsx`, commerce/chat/professional modules. This inventory precedes the current Creator implementation checkpoint. Browser screenshots and final deployed status are coordinator-owned.

| Original action | Backend / source | Web before checkpoint | Status |
|---|---|---|---|
| Approved Creator workspace gate | shared commerce access | CreatorCenter gate | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Overview refresh / active promotions / recorded clicks | creator promotions/clicks | Overview | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Six reporting periods | creator-center-model | No period select | MISSING |
| Earnings and attributed-order summary | creator_commissions + orders | Status totals, limited order data | PARTIAL FUNCTIONALITY |
| Discover search/category | approved products | Discover | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Discover sort recent/price/commission | original local comparator | No sort | MISSING |
| Discover recent attributed Orders tab | commission/order/item queries | Missing | MISSING |
| Product detail/media | products/product_media | CreatorProductDetail | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Create/reactivate promotion | create_creator_product_promotion | Discover/detail | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Existing active promotions | creator_product_promotions | Promotions | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Copy/open canonical affiliate link | existing product route/tracking | Affiliate links | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Per-status commission and reversals | creator_commissions | Earnings | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Growth ranking | get_creator_growth_leaderboard | Growth | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Collab active Seller relationships | distinct active promotion storefronts | Missing | MISSING |
| Campaign invitation/completion | Original explanatory empty states only | Not implemented | ORIGINAL APP PLACEHOLDER ONLY |
| Provider-neutral payment summary | eligible/pending/paid commission statuses | Missing | MISSING |
| Collect payment | Original explanation; provider absent | No money action | ORIGINAL APP PLACEHOLDER ONLY |
| Seller directory/search / authorized chat open | canonical directory/open RPCs | CounterpartyDirectory / chat | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Read/send Creator-Seller messages | creator_seller business context | shared chat | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Profile avatar/bio/category/specializations | own profile + creator application | Identity/status only | PARTIAL FUNCTIONALITY |
| Identity / professional / badge status | get_my_commerce_verification_profile | professional status only | PARTIAL FUNCTIONALITY |
| Badge purchase | Original explanation; no payment provider | No purchase | ORIGINAL APP PLACEHOLDER ONLY |
| Shared Social Profile / profile edit | same identity, no duplicate profile | account edit, missing social link | PARTIAL FUNCTIONALITY |
| Professional review/correction | existing verification request | professional feature | IMPLEMENTED BUT NOT LIVE VERIFIED |

24 action rows: 12 IMPLEMENTED BUT NOT LIVE VERIFIED, 5 MISSING, 4 PARTIAL FUNCTIONALITY, 3 ORIGINAL APP PLACEHOLDER ONLY. No production promotion, message, application or payment is created for this checkpoint. Existing backend contracts, authorization and social-link verification rules remain unchanged.

## Implemented checkpoint

- Restored six local-calendar reporting periods on Overview/Analytics, Earnings and Discover Orders. Last-month boundary handles January and month-end correctly. Clicks and current promotions remain clearly labeled all-time/current, not falsely period-filtered.
- Restored original qualifying attributed sales, earned/estimated/pending/eligible/paid/reversed calculations using commission plus authorized order status; cancelled/refunded/return-approved orders are excluded from qualifying amounts. Current/prior promoted-product count and recent attributed orders appear on Overview.
- Added four discovery sorts (updated, sale-aware price ascending/descending, commission) with existing search/category/promotion actions preserved. Sort is explicitly scoped to the loaded 80 eligible products.
- Added Discover Recent Orders view with the same own-commission → minimal order/item/store joins as the original. Explicit creator ownership filter, ID-scoped batch reads, no customer/payment projections, no Seller management access. Missing join data says unavailable; backend denial is an error, not an empty success.
- Added Collab page from distinct active-promotion storefronts only; genuine campaign invitation/completion placeholders stay labeled unavailable.
- Added Payments informational view from real commission statuses. Requirements button explains the absent provider; no payment/withdrawal API or invented settlement date.
- Expanded own Profile with signed avatar/fallback, bio, category, specializations, identity/professional/badge states; exact `/partner/creator/social?profile=<id>` shared-identity route. No KYC documents loaded. Badge requirements remain explanatory; no charge or approval.

After this implementation checkpoint: **21 IMPLEMENTED BUT NOT LIVE VERIFIED; 3 ORIGINAL APP PLACEHOLDER ONLY** among these 24 action rows. This does not assert all Creator workflows beyond the inventory are complete. Production screenshots and deployed acceptance remain coordinator-owned.

Validation: **49 isolated tests across 3 Creator files passed**, including existing product/professional flows and 25 new period/sort/earnings/relationship/query-scope/profile/payment tests. TypeScript build passed and scoped ESLint passed. All new repository accesses are read-only; no backend schema/RLS/function changes. No actual production promotion, order, chat message, application or payment was generated for QA.

## Final financial/authorization safety review

Read-only live currency audit found nine commission/order rows, all INR, but no INR-only order/product constraint. Currency must therefore not be assumed from that current sample. The minimal order projection now includes `currency`; ledger amounts render in their recorded order currency. Unknown/missing order status or currency is excluded from monetary summaries with a visible omission warning. Multiple currencies suppress combined monetary totals and explicitly direct review to each recorded currency; no exchange rate or converted balance is invented. The original app treated unavailable joins as qualifying and defaulted amounts to INR; this port is deliberately more conservative. Per-row records remain visible even when their summary contribution cannot be established.

Period review confirms six-day/29-day calendar offsets, first-of-month/year boundaries and exclusive next-month boundary for Last month (including January and month-end). Repository review confirms an explicit own-Creator filter, only returned order/item/store IDs in bounded 100-ID secondary batches, no customer fields, and denial propagation. Dependency errors produce retryable errors, never fake zero/paid results. No payment, badge charge or Admin decision endpoint is called by informational requirements buttons.

Exact changed action count: **9 existing gaps closed** (5 missing + 4 partial inventory rows), preserving 12 existing implemented rows and 3 original placeholders. Remaining original placeholders: structured campaign invitations/completion; actual payment collection; paid badge purchase. Actual live mutation acceptance still requires controlled authorized data; current production observations and screenshots are recorded by the coordinator.
