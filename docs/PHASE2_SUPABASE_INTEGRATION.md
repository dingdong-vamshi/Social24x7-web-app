# Phase 2 Supabase integration map

> Historical Phase 1 planning document, superseded on 13 October 2026. The new web client now uses the existing production project, email/password authentication, canonical commerce records and chat Realtime. Phone OTP is disabled in the actual Auth configuration. See [current integration](SHARED_SUPABASE_INTEGRATION.md), [architecture](WEB_PLATFORM_ARCHITECTURE.md) and [verified QA](REAL_BACKEND_QA_MATRIX.md). The proposals below are not current implementation claims or authorization to add backend features.

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

## Future chat and web considerations

Chat is not part of the current Partner Web Phase 1 implementation. If stakeholder scope later adds messaging to Partner Web or the separate consumer web client, all clients should use:

- the same Supabase Auth account and device/session policy;
- the same canonical conversations, participants, and message records;
- the same Realtime publication plus reconnect reconciliation;
- the same RLS membership and Business Chat permission rules; and
- an optional bounded, account-partitioned local cache for startup and limited offline history.

A web cache should use IndexedDB rather than browser `localStorage` for message bodies. A mobile cache should use an encrypted SQLite-class store with its key protected by platform Keychain/Keystore. Cache design does not provide E2EE. Encryption scope, AI Assistant access, retention, multi-device behavior, and whether Partner Web contains Business Chat all require explicit approval before implementation. See `docs/CHAT_WEB_ARCHITECTURE_GAPS.md`.
