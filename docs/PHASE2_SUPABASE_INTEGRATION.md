# Phase 2 Supabase integration map

Target project (later): `kcuxyxqtfkxrbtmugjsn`.

This document is planning-only. No connection, migration, RPC, Storage policy, or production record was changed in Phase 1. Table and RPC names must be verified against the live schema before implementation.

| Frontend interface | Expected integration | Classification |
| --- | --- | --- |
| `AuthRepository` | Existing Supabase phone OTP Auth, session refresh, and unified account lookup | REUSE / ADAPT |
| `PartnerProfileRepository` | Existing account/profile plus seller/creator role claims | REUSE / ADAPT |
| `SellerOnboardingRepository` | Existing seller application records, business verification evidence, and secure document Storage | REUSE / ADAPT |
| `CreatorOnboardingRepository` | Existing creator access/onboarding tables, taxonomy policy, professional credential evidence, and video evidence | REUSE / ADAPT |
| `ApplicationRepository` | Application lifecycle statuses, review notes, missing requirements, and admin decision timeline | ADAPT; unified cross-role timeline may need new read model |
| `SellerCatalogRepository` | Existing storefronts, products, product media, approval status, inventory, and creator commission fields | REUSE |
| `SellerOrdersRepository` | Existing checkout/order/item records and seller-scoped fulfillment operations | REUSE / ADAPT |
| `SellerReturnsRepository` | Existing return requests and packing/unboxing evidence with seller review RPCs | REUSE |
| `SellerFinanceRepository` | Existing commission and order value records | ADAPT; seven-day settlement ledger/read model likely required |
| `SellerTeamRepository` | Existing team memberships, roles, custom permissions, activation, verification, assignment, and audit events | REUSE |
| `CreatorDiscoveryRepository` | Approved products with creator promotion enabled and seller/storefront context | REUSE / ADAPT query |
| `CreatorPromotionRepository` | Existing promotion creation, tracking code, commission snapshot, and lifecycle | REUSE |
| `CreatorEarningsRepository` | Existing creator commission attribution and eligibility/payment status | REUSE / ADAPT |
| `AnalyticsRepository` | Aggregated seller and creator operational metrics | NEW BACKEND WORK LIKELY REQUIRED for efficient read models/RPCs |

## Integration sequence

1. Inspect and document the live schema, RLS policies, RPC signatures, and Storage buckets without changing production.
2. Configure only `VITE_SUPABASE_URL` and the browser-safe anonymous key locally. Never expose service-role, database, AI, SMTP, or deployment secrets.
3. Implement a Supabase repository registry alongside the mock registry.
4. Establish unified role claims and server-authorized workspace routing.
5. Add signed uploads and evidence metadata for onboarding and return workflows.
6. Add settlement and analytics read models only after confirming existing records cannot serve those views efficiently.
7. Route payment/subscription and AI work through secure server or Edge Function boundaries.
8. Run contract tests against a safe non-production environment before enabling production.
