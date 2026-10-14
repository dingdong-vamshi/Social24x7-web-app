# Webapp 2 production verification — 14 October 2026

> Historical earlier-release receipt. Current recovery deployment chain is in `WEBAPP2_DEPLOYMENT_HANDOFF.md`, with current read-only production acceptance in `WEBAPP2_FINAL_CLIENT_ACCEPTANCE.md`. Do not use this earlier receipt's authentication limitations or asset identity as the current release state.

Feature commit c0c296b55479e5fb2efede6e32dee7c04fc94f8b, followed by mobile-action/CLI-cache cleanup commit bc344a745b4ab44da543b7cdf4806e798ad8e2b8. Both pushed to main. No PR requested.

Vercel production deployment dpl_nnACoE6dDbts91uDwgNYgfR2yq3o reported Ready; GitHub Vercel commit status success. Existing project prj_KoHp74rBLTBRH8OWONTOpKQ8GGWQ was reused.

Verified live aliases: Partner, WWW, Customer, apex, existing Vercel fallback. HTTP/bundle verification on Partner, WWW and fallback returned 200 and exactly matched local /assets/index-erYIUM9r.js:

SHA256: 6f6a323f5097c9cb0709ac9184e9d4a528ad7d15649f832c5e6573774aad89a8

Final Supabase project read: ACTIVE_HEALTHY, ap-south-1, PostgreSQL 17.6.1.166. This describes availability, not a full security certificate.

## Production browser checks

- Login, Seller signup and Creator signup: 1440/1280/1024/768/430/390/360px, no horizontal document overflow.
- Work link opens separate Work login; Personal account link returns correctly.
- Password starts hidden; keyboard Enter toggles text/password without form submission. No actual password entered.
- Signup displays all five requirements and two separately labelled visibility controls. No signup submitted.
- WWW Seller entry reaches Partner Seller signup; Creator navigation reaches Creator signup; sign-in continuation retains role.
- Forgot password route and role-preserving return work. No recovery email requested.
- Direct reset URL without a recovery code shows an invalid/expired/used/cross-browser explanation and no password form.
- Fallback forgot-password entry redirects to official Partner before any PKCE/email request.
- Anonymous Seller products, Creator, Admin, personal chats, Social and application status routes redirect to personal login. Business workspace redirects to Work login.
- No production browser errors observed. A prior isolated-preview missing-export error was fixed before final visual testing; it was not a production error.

Screenshots are in /Users/vamshipendyala/Documents/Social24-7-Webapp2-2026-10-14/. Production images: production-login-{width}.jpg, production-work-login-360.jpg, production-forgot-360.jpg, production-invalid-reset-360.jpg, production-seller-signup-{1440,390}.jpg, production-creator-signup-{1440,390}.jpg.

Isolated Seller/Creator/Admin/New Chat layouts also passed seven widths. The 768px onboarding overflow and a sticky-action overlap found during screenshot review were fixed. Final mobile proof: isolated-creator-final-390.jpg. Yellow-banner screenshots are not live-account evidence.

## Test and release limits

454 tests across 42 files passed; TypeScript, Vite production build, ESLint and Deno check passed. Main JS remains approximately 612 KB minified (non-fatal chunk warning). Separate 51-case PostgreSQL suite passed on synthetic PG14.19; previous Storage candidate had 55 isolated checks.

Source and tested implementations for C01–C13 are deployed. Full acceptance is NOT complete: real confirmation/reset delivery, successful controlled identifier login, two-account chat/Realtime, current Admin/employee roles, own-store media readback and true application lifecycle tests still require authorized controlled sessions/records. Existing personal Seller draft preserved; no real applications submitted or reviewed.

Remaining security findings and exact rollback boundaries: WEBAPP_2_BACKEND_RELEASE.md. In particular, the separate product-specific Storage UPDATE path weakness is not repaired by the approved generic-policy change. Do not call the project fully secure or every feature production-verified.
