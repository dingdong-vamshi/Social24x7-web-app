# Webapp 2 — Partner delivery ledger

14 October 2026. Baseline c055fd285d475d943894a40245b7797ccf38f408, initially clean main. Earlier context recovered from Build Social24x7 web app, repo handoffs and screenshots. Original mobile source remained read-only. No Customer pairing, APK, DNS or financial changes.

The supplied request ends at section 25; no separate client screenshot was attached. Results below distinguish implementation, local tests, production configuration reads and real-account acceptance.

| ID | Request / code | Implementation and local test | Backend / production evidence | Result |
| --- | --- | --- | --- | --- |
| C01 | Work link · pages/Auth.tsx | Top-right link; seven-width and navigation checks | Production click opens Work account login; screenshot production-work-login-360.jpg | PASS — PRODUCTION VERIFIED (navigation) |
| C02 | One identifier · AuthContext.tsx | Email/phone/username + password; generic errors, ambiguous phone denied; Auth + Edge tests | Private service-only resolver + Edge v1 deployed; negative live request passed; successful controlled login unverified | IMPLEMENTED — BACKEND UNVERIFIED for successful login |
| C03 | Recovery · PasswordRecovery.tsx, auth/recovery.ts | Generic email request, recovery-only verified exchange, no normal-session bypass, strong match check; seven tests | Exact reset allowlist saved; invalid URL local browser verified; real inbox/reset blocked | BLOCKED — real mailbox |
| C04 | Strong policy · passwordPolicy.ts | Shared eight–128 character signup/reset validation; existing login preserved; Work remains ten-character | Server min eight + upper/lower/digit/symbol saved/read back; real signup/reset unverified | PASS — LOCAL ONLY; configuration verified |
| C05 | Visibility · PasswordInput.tsx | Hidden default, keyboard button, no submit, preserved value; unit/browser tests | Production keyboard toggle verified; signup has separate accessible confirmation toggle | PASS — PRODUCTION VERIFIED (toggle); value persistence unit-tested |
| C06 | Casing · applicationFields.ts / Onboarding.tsx | Blur-only trade/store/city normalization; legal/acronyms/URLs preserved; draft save/back tests | Existing authoritative draft RPC source traced; genuine records untouched | PASS — LOCAL ONLY |
| C07 | PAN · applicationFields.ts / Onboarding.tsx | Uppercase/trim/format errors, normalized save, masked review test; not verification | Existing Seller draft/server normalization traced; no genuine PAN changed | PASS — LOCAL ONLY |
| C08 | Seller links · Onboarding.tsx | Four optional HTTPS/domain-validated links, review and draft mapping | Existing application_payload.socialHandles; source and memory integration tested; no production submission | PASS — LOCAL ONLY |
| C09 | Admin links · repositories/admin.ts / Admin.tsx | Same authoritative record, safe external links, manual-review wording; memory submission/detail test + isolated browser | Existing Admin authorization/review source inspected; live pending counts read only; no decisions | PASS — LOCAL ONLY |
| C10 | New Chat · personalDiscovery.ts / NewPersonalChat.tsx | Discoverable username search, request/accept/decline, pending/reuse, no business access; UI + SQL tests | New wrappers/consent guard deployed; real two-account send/list/Realtime not tested | IMPLEMENTED — BACKEND UNVERIFIED for live delivery |
| C11 | Dr title · publicIdentity.ts, social/chat repositories | Current approved medical professional only, no duplicated title, no legal-name write, revoked status denied; SQL tests | Presentation RPC deployed/read-verified; live approved UI/title not tested | PASS — LOCAL ONLY |
| C12 | Tiers · onboardingRules.ts | Nano 1K–10K, Micro 10K–50K, Mid 50K–500K, Macro 500K–1M, Mega 1M+; no derived numeric count | Existing payload tier; isolated browser shows all options; no production application mutation | PASS — LOCAL ONLY |
| C13 | Creator links · Onboarding.tsx | Conditional Instagram/Facebook/TikTok/YouTube/website URLs; selected only on review/save; validation tests | Existing social_handles + payload; Admin source/mapping; no production submission | PASS — LOCAL ONLY |

## Automated and browser evidence

- Final full run before release: 454 tests passed across 42 files; TypeScript/Vite build and ESLint passed. Main bundle retains a non-fatal >500 KB warning.
- 51 isolated PostgreSQL 14.19 checks passed. Production is 17.6; this is not a full Supabase clone.
- Deno type-check passed; ten Edge handler tests included in frontend suite.
- Browser widths: 1440, 1280, 1024, 768, 430, 390, 360. Login/recovery, isolated Seller/Creator, Admin and New Chat have no document overflow. A discovered Creator 768px overflow was fixed and all seven widths retested.
- Browser: Work navigation, keyboard show/hide, missing-reset authorization rejection, conditional Creator fields, isolated Seller save and chat pending state verified.
- Authenticated workspace, account switching, logout, Business Chat and permissions have automated regression coverage; that does not replace new live role-session testing.
- Production release/browser verification is recorded in WEBAPP_2_PRODUCTION_RECEIPT.md. Authenticated application screenshots remain isolated, not production proof.

Private screenshot folder: /Users/vamshipendyala/Documents/Social24-7-Webapp2-2026-10-14/

| Evidence | Scope |
| --- | --- |
| supabase-redirects.jpg / supabase-password-policy.jpg | Live saved dashboard configuration |
| local-login-{width}.jpg | Local production-component login at seven widths |
| local-forgot-360.jpg / local-invalid-reset-360.jpg | Local recovery UI, no mail sent |
| isolated-creator-final-390.jpg | Final conditional social profiles + audience, synthetic data; supersedes earlier mobile sticky-action screenshot |
| isolated-seller-{1440,390}.jpg | Optional business links, synthetic data |
| isolated-admin-{1440,390}.jpg | Manual social review + safe external links, synthetic record |
| isolated-chat-390.jpg | Consent pending, synthetic repository |

Isolated preview: qa/README.md. It cannot contact Supabase; submissions/uploads/decisions are disabled and memory drafts reset on reload. It is excluded from deployment.

## Explicit remaining acceptance

Real signup confirmation/reset, successful phone/username login, two-account chat delivery/Realtime, owner media upload/readback, current Admin/employee/session-isolation acceptance and genuine application-to-review lifecycle remain unverified. No approved private rotated credentials were available. The user's existing Seller draft was read-status checked and preserved.

No production submissions, approvals, rejections, KYC files, bank changes or money operations were used to obtain proof. No password was used, saved or committed. See WEBAPP_2_BACKEND_RELEASE.md for the remaining product-path Storage concern, broader security findings and rollback. This delivery is not a full production-security or every-button acceptance certificate.
