# SOCIAL 24-7 web platform architecture

Updated 13 October 2026. This documents the connected implementation, not the earlier Phase 1 mock preview. Release/deployment verification is recorded separately in `REAL_BACKEND_QA_MATRIX.md`; this architecture document does not certify a deployment.

## One frontend workspace, three surfaces

The existing React + TypeScript + Vite application contains public, business and consumer routes. React Router and the Vercel SPA rewrite support deep links and refresh. Workspaces are lazy-loaded. The official web-facing display name follows the latest client instruction: **SOCIAL 24-7**. Historical repository names, database identifiers and existing domains remain unchanged.

| Surface | Preview routes | Intended hostname | Responsibility |
|---|---|---|---|
| Public | `/`, `/info/seller`, `/info/creator`, `/info/partners`, `/info/about` | `www.social24-7.com` | Product information and account entry; official app logo/colors; client screenshot-inspired layout |
| Partner / business | `/partner`, `/partner/login`, `/partner/register`, `/partner/onboarding/:role`, `/partner/seller/*`, `/partner/creator/*` | `partner.social24-7.com` | Seller/Creator applications, approved workspaces and supported business-conversation views |
| Consumer | `/web/login`, `/web/register`, `/web/chats`, `/web/chat/:id`, `/web/orders` | `web.social24-7.com` | Existing account conversations, text messaging and order history |

At the root path, hostname-aware routing sends the business hostname to `/partner` and the consumer hostname to `/web`. All three surfaces are also reachable by prefix under the existing preview hostname. DNS and custom-domain bindings were not changed. Legacy `/login`, `/register`, `/seller/*` and `/creator/*` redirect with query strings preserved; `/onboarding/*` and `/application` remain functional aliases.

## Shared identity and authorization

`src/lib/supabase.ts` creates one browser client for `kcuxyxqtfkxrbtmugjsn`. It refuses an unexpected project URL and rejects service-role/secret keys. The configuration accepts the public publishable key, with legacy anon-key compatibility. No database password, Management API token or provider secret is used by the frontend.

`src/auth/AuthContext.tsx` restores the session and loads `profiles`, `get_my_creator_commerce_access` and owned `storefronts`. Authentication reuses the actual mobile email/password plus registered-phone check (`verify_my_login_phone`). It holds the early Auth sign-in event until that check succeeds. Account changes clear previous data, and request sequencing rejects stale account results. Token refresh and returning to the tab refresh capabilities. `RequireAuth` waits for resolution, fails closed on lookup errors and checks server approval before opening Seller or Creator routes. RLS and existing checked RPCs authorize every backend operation.

An ordinary account can also have Seller and Creator approval; these are independent server capabilities, not a mutually exclusive client role selector. Personal access does not require commerce onboarding. Professional Creator is a conditional credential capability. Business employees use a separate existing work identity and are denied personal/owner workspace entry here. The 14 October Admin release adds `/partner/admin` using the existing Admin capability and review RPC, with shared account navigation and capability-aware login routing. No agency/Partner role was invented. See `ACTUAL_SOCIAL24_ROLE_MATRIX.md` and `ADMIN_WEB_RELEASE.md`.

Live Auth settings currently enable email, disable phone Auth and disable OAuth providers. Email confirmation is required for new signup. Existing QA account login and real role resolution were verified. Latest user direction keeps the working email/password flow for now and prefers **email OTP later** due to SMS cost. Email OTP is not implemented or advertised as available. Signup callback delivery/redirect completion is still awaiting an authorized new-account test.

## Module boundaries and canonical backend contracts

| Module | Frontend boundary | Canonical data/API |
|---|---|---|
| Auth/access | `src/auth/AuthContext.tsx`, `RequireAuth.tsx` | Existing Supabase Auth, profiles, commerce access RPC, storefront ownership |
| Onboarding/status | `src/auth/onboardingRepository.ts`, `onboardingRules.ts`, `onboardingValidation.ts` | Existing draft RPC, Seller/Creator applications, professional requests, private evidence bucket/document metadata |
| Seller/Creator commerce | `src/repositories/commerce.ts` | Products, orders/items/fulfillments, returns, promotions, commissions, team dashboard and existing product/promotion RPCs |
| Consumer/business chat | `src/features/chat/repository.ts` | Conversations, participants, messages, message/read RPCs, Realtime, private attachment metadata/media |
| UI | `src/pages`, `src/components` | Presentation, validation and authorized navigation; no duplicate persistence/approval model |

Production routes do not import `src/repositories/mock` or fixture datasets. Historical mock modules remain isolated source material and are not a fallback for failed live calls. A failed query produces an error; no fabricated account, sales number or approval replaces it.

## Onboarding and protected evidence

The connected flow adapts actual mobile behavior: Seller type → Business → Store & pickup → Bank → Business Verification → Review. Creator uses Category → Social presence → Identity & payout → conditional Professional verification → Review. The complete mobile taxonomy and credential rules replace the earlier illustrative subset. Fields and payload mapping are detailed in the role matrix.

Drafts use `save_creator_commerce_onboarding_draft`. Submission retains the mobile application's existing upsert contracts and `submitted` transition. Approved/submitted/under-review/suspended states are locked; review notes and requested corrections come from backend records. No client control grants approval or activates a storefront.

KYC/business evidence uses existing private `creator-commerce-private` storage, owner-prefixed paths, the 15 MB limit and supported MIME types. Success requires both a Storage result and document metadata insert. Unsaved entries remain in memory; saved bank/identity fields follow the existing protected backend application payload. No KYC or bank draft is saved to browser localStorage. Actual upload/submission on a suitable unapproved QA account remains unverified; approved QA roles were not modified to force this test.

## Commerce behavior

Seller reads are scoped to an owned storefront and Creator reads to the authenticated Creator. Live modules cover catalog, orders, returns, logistics, recorded finance/commission data, team visibility, promotions, profile and bounded analytics. Unsupported financial balances are not fabricated. Query limits are disclosed in the UI.

Product save/publish, product image attachment and promotion creation use the existing secure RPCs. Product editing is gated when multiple storefronts make the existing owner-selected save RPC ambiguous. Creator links reuse the existing mobile-web storefront/product destination and canonical tracking code. Order fulfillment, refunds/payouts, payment capture, subscription billing, team activation/permission changes and storefront/profile edits stay in the existing application or remain deferred. See `SHARED_SUPABASE_INTEGRATION.md` for exact bindings and mutation-verification limits.

## Conversations and synchronization

Both clients use the same user accounts, conversation IDs, participants and canonical message records. Text sends use `send_personal_message`; read state uses the existing membership-checked RPC. Realtime invalidates the view, which then reconciles authorized records. Pagination, deterministic ordering, message-ID deduplication, stable retry IDs, reconnect catch-up and subscription cleanup are implemented. Message bodies are held in memory, not a second browser database.

**Observed proof:** authorized QA text was delivered in both directions between the new browser client and the existing mobile codebase's deployed **web client**, with Realtime updates. This is real cross-client evidence using the shared backend. An installed Android APK/device was **not tested**, so APK↔web delivery is not certified by this result. See the QA matrix and local screenshot proof for recorded cases.

Existing personal/group conversations can be read and texted according to backend permissions. The business surface filters to business conversations. Buyer–Seller owner monitoring remains read-only where the existing reply rule requires the assigned verified Business Work member; ownership is not treated as reply authority. The complete employee/supervisor web workspace, attachment uploads, voice recording, group administration and rich interactive message actions remain outside this delivery.

Existing private chat attachments are signed only after authorized metadata lookup, for a short lifetime. Payload URLs are not trusted as private-media access. HTTPS/WSS, Auth, RLS and membership checks preserve the existing security model. Message bodies remain server-readable. **True E2EE and encrypted local message caching are not implemented.** Introducing E2EE also changes the existing server-side AI Assistant's access to authorized Personal Chat context.

## Repository and production boundaries

All code writes target `dingdong-vamshi/Social24x7-web-app`. The old mobile checkout at `/Users/vamshipendyala/Library/Mobile Documents/com~apple~CloudDocs/Desktop/july28drchiag` was inspected read-only, with starting HEAD `e207f7526f140976630b92c09782a87998f6a8c6`. Source reuse includes mobile Auth, onboarding, commerce and chat contracts. Final HEAD/status comparison is recorded by the coordinating QA pass.

No database schema, RLS, Auth provider configuration, Storage bucket/publication configuration, Edge Function or mobile source changes were made for this frontend integration. Authorized QA text sends/read-state updates are application data operations, not schema/configuration changes. Existing backend advisor findings remain separate production-hardening work; this delivery does not silently rewrite their policies.

## Verification boundary

Automated tests exercise route guards, session-event isolation, field validation, draft-state retention, repository filters, canonical RPC use, chat reconciliation and error states with controlled responses. Those tests are distinct from real account/browser evidence. Deployment status, final SHA, exact test totals, responsive widths, screenshot counts and remaining live test cases belong in the final QA matrix and `TWO_DAY_HANDOFF.md`; architecture alone is not proof of release completion.
