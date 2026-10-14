# Admin and account navigation release — 14 October 2026

The new web application now hosts Commerce Admin at `/partner/admin`. The Admin account defaults to this route after login. Explicit consumer or public-site navigation remains available. Seller/Creator capabilities remain independent; accounts with both approved capabilities select a workspace or restore a still-authorized session preference. A preference never grants access.

## Existing backend reused

- Capability: `get_my_creator_commerce_access().admin_access`, backed by `creator_commerce_access`.
- Queues: `seller_applications`, `creator_applications`, `professional_verification_requests`, protected by existing Admin read policies. Drafts are excluded as in the existing mobile review interface. All summary pages are retrieved before calculating counts.
- Review: `review_creator_commerce_application(target_kind, target_id, target_decision, target_reason)`. The browser never updates approval columns directly. Existing transitions and readiness checks remain authoritative.
- Evidence: existing `creator-commerce-private` bucket, authenticated Storage authorization and 300-second signed URLs created only when requested. The viewer expires locally, supports renewal, and is removed on leaving the account. No evidence is stored in localStorage; sensitive identifiers are masked in the detail presentation.
- Verification: existing `commerce_verification_profiles`; absent/error states are labeled rather than replaced with successful verification.
- Review History shows each application's latest recorded review timestamp/note, not an invented full audit-event timeline. Existing reviewer fields and downstream approval behavior remain owned by the existing RPC.

## Navigation and account state

Public, Admin, Seller, Creator, onboarding, status and consumer screens share an accessible account control with authorized destinations and explicit Log out. Login pages wait for hydration and route signed-in users automatically. The public homepage remains intentionally accessible. Consumer entry requests consumer login and preserves its return route.

Logout clears account state and the current user's optional session workspace preference; failures are surfaced. Account changes unmount private Admin state. Permission refresh errors clear previous capability/profile data and fail closed. Focus/visibility and token-refresh events re-fetch roles. Frontend Admin guards supplement, rather than replace, existing RLS/RPC enforcement.

## Verification and limitations

Local connected browser checks passed for Admin login/redirect, summary counts, all three queues, detail, private evidence, confirmation/reason validation (cancelled), refresh/deep links, approved workspace switching, consumer entry and orders, approved onboarding redirects, logout, Admin-to-non-Admin account change, and non-Admin denial. At 390/360px the Admin queues/detail and consumer screens had no document overflow. A non-Admin call to the review RPC with a nonexistent sentinel ID was rejected with `42501` before any data mutation.

No status mutation was executed: the available submitted review records were already approved and no pending controlled QA case was present. Unit tests validate review parameters, status transitions, required reasons and duplicate-click prevention. Live approve/reject/request-information acceptance still needs an authorized submitted QA application.

Fresh unapproved registration/full onboarding submission is not repeated by this release. Existing onboarding validation/persistence tests remain in the regression suite. The two available non-Admin browser QA identities both have Seller and Creator approval; sole-role/ordinary-user default routing is covered by automated controlled-state tests.

No schema, RLS, Auth provider, Storage policy, credential, role, approval, payment or mobile source/deployment changes are included. Browser login/session activity and normal chat read-state updates may occur during read-only UI checks. No new chat test messages are required for this navigation release.
