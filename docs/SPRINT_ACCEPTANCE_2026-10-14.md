# Recovery acceptance — 14 October 2026

## Baseline and safety

Started from clean main/deployed `ea60a51076ab57034ca333f834f3e5c60f9aefc6`, not the older historical checkpoint. Shared Supabase is `kcuxyxqtfkxrbtmugjsn`. Existing authorized QA credentials were used through normal Auth and browser forms; no service-role impersonation. The old mobile repository remains read-only and clean.

## Controlled live writes

The authorized Seller was verified against Auth and its own single test storefront before creation. Existing save RPC was inspected: a new row is draft/draft and has no checkout/publication side effect. One controlled QA product (`QA-RECOVERY-20261014`) was created with zero stock, promotions disabled and price INR 1. This item is deliberately **not for sale**.

The current local frontend, connected to the real backend, then edited that draft, uploaded two harmless QA images, reordered them, changed primary cover and saved product SEO. Each result was read back from canonical `products` / `product_media`; final state remains draft, zero stock, promotions disabled, two media rows. No product was published. No genuine product/order was changed. No financial operation, employee status, approval, schema, RLS, account or Auth setting was changed. The QA draft and two linked images are retained; no cleanup/deletion is implied.

A preliminary upload assertion saw an old success message before a new save completed. The web now clears the prior result on Edit; later acceptance waits for fresh completion and canonical readback. Early failed harness attempts are not counted as successful uploads.

## Browser and security evidence

Additional controlled write: one harmless PNG labeled QA was sent through the new attachment composer in an existing Personal conversation verified to contain exactly the two authorized QA identities. One finalized `chat_attachments` row and one canonical message were read back by the second participant; reload retained it. No new conversation/group or unrelated chat was accessed. This verifies persistence and authorized recipient reads, **not** a fresh Realtime-without-refresh or APK acceptance run. Group picker was opened and cancelled. Existing read-marker updates may occur when opening authorized QA conversations.

Combined checkpoint: build, lint and 344 tests pass. Main bundle size warning remains; it is not a build failure. Profile narrow-screen overflow and stale product-save feedback were fixed and rechecked. Additional read-only browser interactions reject reversed dates, retain filter values, show a real future-date empty state, reset filters, and render the saved QA media/SEO editor.

Evidence is outside Git in `/Users/vamshipendyala/Documents/Social24-7-Recovery-Sprint-2026-10-14/`. Local screenshots against real Supabase are labeled `local-*`; isolated Professional UI screenshots are explicitly `local-tested-fixture-*`. Production evidence will use `production-*` after deployment.

Local read sweep: 20 pages, 114 viewport checks (1440/1280/1024/768/430/390), no page exceptions or overflow after repairs. Actual Admin and Seller browser login, expected default routes, approved onboarding redirects and logout/protected routes pass. Profile avatar missing-object errors are recoverable status, not an invented image.

Server enforcement verified with normal QA sessions: another approved Seller cannot update the controlled draft; Seller A cannot fetch Seller B team dashboard; non-Admin review RPC is denied before record lookup; non-owner cannot read the QA Seller application; nonmember cannot read message IDs from an unrelated Personal conversation. These are bounded tests, not a complete cross-role certificate. Work suspended/removed/reassignment tests are isolated; no controlled employee login was available.

## Evidence-storage blocker

The approved QA Seller has a document reference but the corresponding private Storage object does not exist; no verification-video reference exists. Its nine `creator_commerce_documents` metadata rows also point to absent objects. Admin signing therefore cannot prove successful evidence access, and another account's failure on that missing object is **not** proof of RLS denial. Do not fabricate replacement KYC. Viewer failure/expiry/retry and access gates are covered by isolated tests; valid controlled evidence is required for end-to-end live acceptance.

The approved QA professional request also has a legacy category/policy mismatch. The new page displays that fact and refuses corrections; it does not silently rewrite existing professional data.

## Still not certified

Full employee invitation/activation/work-password/assignment/revocation; controlled application approval/reject/request-info round trip; independent professional live correction/upload/review; fresh unapproved onboarding; actual product publishing; genuine fulfillment/return/commission mutations; installed APK; QR pairing; provider-backed payments. See scoped sprint findings and final handoff for exact current statuses.
