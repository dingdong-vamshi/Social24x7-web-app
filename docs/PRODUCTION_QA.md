# Production QA — client flow update

Date: 14 October 2026. Target project: kcuxyxqtfkxrbtmugjsn. Existing Vercel project only.

## Verification ledger before deployment

- Local browser with real authorized QA logins: PASS. Separate browser contexts for Naveen, Yogesh and Admin.
- Naveen and Yogesh: backend access reports Seller approved, Creator approved, non-Admin. Admin: Admin true, Seller/Creator not_applied.
- Direct Seller and Creator login: PASS; no forced generic role selector.
- Seller ↔ Creator switches: PASS, same identity.
- Admin login: PASS. Non-Admin access denied: PASS.
- Seller products, orders, team, Business Chat, Creator discover/promotions and own-account Chats/Orders: read-smoke PASS; zero REST failures/page exceptions. This does not certify mutation completeness.
- Social feed, post detail, search, basic profile and notifications: real backend read PASS.
- Logout then protected route: PASS for all three identities.
- Existing approved Seller/Creator onboarding entries: approved status shown, not fresh application.
- Customer /web/app remains unavailable even with a valid Partner session: PASS fail-closed behavior, not QR pairing.
- 63 local viewport checks: 9 views × 1440, 1280, 1024, 768, 430, 390, 360; no document overflow.
- 28 isolated onboarding viewport checks: current Seller type/business and Creator category/social-presence components; zero backend traffic; Seller Back retains entered fixture value. 8 labeled preview images.
- Unit coverage includes signup callback options, approval routing, callback recovery, hostile redirects, Work exclusion, viewer/recipient checks and failure/draft handling.
- Build (including TypeScript), lint and all 199 tests across 25 files: PASS. Vite reports a non-blocking main-bundle size warning (~590 kB minified); Social is lazy-loaded.

## Explicitly not proven

Controlled Seller/Creator signup → email delivered → confirmation → live callback session is BLOCKED. Correct Supabase Auth settings access and a controlled inbox are missing. Recovery-page screenshots are not confirmation-success proof.

QR challenge, mobile approval, browser handoff, expiry/replay/revoke and installed APK tests are NOT IMPLEMENTED / BLOCKED. No fake QR images exist.

New unapproved onboarding persistence/submission was not exercised. Available QA accounts are approved; previews are deliberately nonpersistent.

Social publishing, comments, likes/follows, notification mark-read, newly delivered live notification events and browser push are not live-write certified. Commerce/team mutation tests from other releases are not reasserted by this read-only smoke.

## Evidence

Private durable directory:
 /Users/vamshipendyala/Documents/Social24-7-New-Web-Flow-2026-10-14/

- local-*.png: local browser, live authorized backend reads.
- preview-*.png: isolated current component, fictional state, no backend.
- production-*.png: reserved for actual deployed verification after push.
- local-results.json and production-results.json: sanitized machine-readable results.
- qa.cjs and preview.cjs: private reproducibility harnesses; credentials are read only from the existing authorized private context at runtime, never stored in source/screenshots.

Screenshots redact unrelated Social/chat content and private fields. They are not visual proof of unreadable record contents; backend request success and UI navigation are recorded separately.

## Safety

No account created; no approvals, KYC, bank information, public Social records or business data changed. Normal QA sign-in creates Auth sessions. No schema, RLS, Storage, Auth provider, DNS or old-mobile source changes. No APK verification claim.

## Deployment

Production verification is pending the current release push. The final client report must use actual GitHub/Vercel status and production browser results rather than infer deployment from a local build.
