# SOCIAL 24-7 two-day handoff

Prepared 13 October 2026 for the connected web implementation. **Status: partially verified connected release; exact remaining checks below.** Deployment verification is recorded in `REAL_BACKEND_QA_MATRIX.md`. This document does not claim that the final commit has already been deployed.

## What is implemented

- A shared React/Vite application with distinct public, Partner and consumer routes, legacy route compatibility and future hostname entry routing.
- SOCIAL 24-7 web branding, reuse of the app's logo motif/colors, a redesigned public homepage/navigation and two-column registration/login presentation based on the supplied composition references.
- Existing Supabase authentication, profile and capability resolution, approved-workspace guards, account switching/sign-out and the existing registered-phone login check.
- Actual Seller and Creator application forms, backend drafts, private evidence upload implementation, conditional professional credentials and genuine review/status views.
- Live owned-store Seller data and Creator data: catalog, orders, returns/logistics, recorded commission/finance values, team visibility, discovery, promotions, links and profile.
- Existing product save/publish/media and Creator promotion RPC integrations, with visible errors and current backend constraints retained.
- Consumer conversation list/history, personal/group text messaging, supported business-conversation views, short-lived private attachment links, Realtime/reconnect reconciliation and consumer order history.

There is no mock account or fixture fallback in production routes. Historical mock files are isolated and not connected to the shipped route graph. Informational Partner/agency content does not create a production Partner role.

## What has actually been verified

| Area | Evidence/status |
|---|---|
| Supabase identity | Existing project `kcuxyxqtfkxrbtmugjsn` checked; shared with the old app |
| Existing account login | Naveen and Yogesh successfully used the real browser login; regression rechecked after the Auth event-race fix |
| Real roles | Both QA accounts currently resolve approved Seller and Creator capabilities; Naveen also resolves professional approval. QA roles were not rewritten |
| Real data | Authenticated profile/workspace access and shared data loading observed; per-module read/mutation cases are tracked in the QA matrix |
| Text synchronization | Both directions observed between the new browser client and the old mobile-code application's deployed **web client**, using the same backend and Realtime |
| Installed APK/device synchronization | **NOT TESTED**; the old application web client is not APK evidence |
| Automated Auth/onboarding checks | 16 targeted tests passed at the Auth workstream checkpoint; final full-suite totals belong in the release QA matrix |
| TypeScript and scoped lint | Passed at the latest Auth workstream checkpoint; repeat the complete release commands after final edits |
| Production deployment | Verify final SHA/deployment in the QA matrix; not certified by this document |

QA screenshots are being captured outside Git in `/tmp/social24-7-web-final-proof/`. This directory is temporary and should be copied to an approved durable handoff location before the machine's temporary files are cleared. Final screenshot count and the flow index must come from the completed evidence inventory, not from the earlier 37-image mock flow.

## Outstanding verification and delivery limits

1. **Signup confirmation:** real account creation, email delivery, redirect allowlisting and PKCE confirmation callback still need an authorized test. Existing account login is verified independently.
2. **Onboarding writes:** secure upload and draft/submission code follows the existing mobile contract and has client tests, but live upload/submission has not been exercised against a suitable unapproved QA application. Existing approved QA roles were not downgraded or reset.
3. **APK and privacy proof:** run an installed APK alongside web and complete the release matrix's cross-account conversation/media-denial cases. Same-backend compatibility and two-way browser-client evidence do not replace this test.
4. **Commerce writes:** record each authorized product/media/promotion mutation test separately. Read-only dashboard evidence does not prove product publishing, image persistence or all affiliate writes.
5. **Business work accounts:** the full employee/supervisor web workspace, assignment/takeover, activation and team permission mutations are not implemented. Existing owner buyer–Seller conversations respect read-only reply restrictions.
6. **Operations:** fulfillment transitions, refund/payout execution, payment/subscription backend, courier booking and new settlement rules remain unavailable here. Finance shows recorded values, not an invented available balance.
7. **Consumer breadth:** attachment uploads, voice recording, rich poll/event actions, group administration and the full mobile super-app are not recreated. E2EE and encrypted offline history remain separate architectural work.
8. **Domains/release:** no custom DNS/domain binding was changed. Verify the existing Vercel project's deployed commit and critical routes before calling the handoff deployed.

## Authentication direction

Current delivery keeps the working email/password model and the existing mobile registered-phone consistency check. The live project disables phone Auth and all OAuth providers. The user's latest preference is **email OTP in a future iteration**, due to SMS cost; email OTP has not been implemented, and no SMS provider was enabled. Future email OTP needs the correct email template/delivery setup, anti-abuse limits and explicit same-account verification. It must not create a second user identity for an existing account.

No password, OTP, Auth token, private document or QA phone/email value belongs in committed documentation or screenshots. Use the approved QA credential channel. Do not create replacement users, reset passwords or alter roles simply to make a scenario pass.

## Run locally

Use a current Node.js 22+ runtime and npm. In the **new** repository:

```sh
npm ci
```

Create an ignored `.env.local` based on `.env.example`, using public configuration only:

```dotenv
VITE_SUPABASE_URL=https://kcuxyxqtfkxrbtmugjsn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

`VITE_SUPABASE_ANON_KEY` is supported only as a legacy public-key alternative. Do not place service-role keys, database passwords, PATs or provider keys in a Vite variable. Public Vite configuration is bundled into the frontend. The client intentionally refuses another project URL and privileged key formats.

```sh
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite. Test `/`, `/partner/register`, `/partner/login`, `/onboarding`, approved `/partner/seller` and `/partner/creator`, `/web/chats` and `/web/orders`. A signed-out deep link should go to login; changing a URL/local value must not approve a workspace.

## Build and release checks

```sh
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

`npm run build` includes TypeScript and writes the Vite production bundle to `dist/`. Test the preview build, not only the development server. Browser QA should cover the requested desktop/tablet/mobile widths, keyboard labels, deep-route refresh, account switching, failed requests, validation and retained state. Tests use controlled responses where appropriate and do not prove production RLS by themselves.

## Deploy the existing web project

Repository: `https://github.com/dingdong-vamshi/Social24x7-web-app`, branch `main`.

Existing web URL: `https://social24x7-web-app.vercel.app/`.

Use the already linked **social24x7-web-app** Vercel project, its `npm run build` command and `dist` output. Configure the same public variables in the intended deployment environment. Commit only genuine new-web changes, push `main`, and use the existing project's connected Git deployment or its already-linked CLI deployment. Verify `.vercel/project.json` targets the new web project before any CLI deploy. Do not create a replacement project, copy service secrets or touch the mobile deployment. `vercel.json` provides the SPA rewrite needed for route refreshes.

After deployment, compare the actual served release with the pushed SHA and repeat public/register/login, approved Seller/Creator and consumer chat/order checks. Record production-only failures separately. Custom domains require independently verified configuration/ownership; this handoff does not claim they are connected.

## Repository and backend safety record

- Old mobile repo: `/Users/vamshipendyala/Library/Mobile Documents/com~apple~CloudDocs/Desktop/july28drchiag`.
- Old baseline HEAD: `e207f7526f140976630b92c09782a87998f6a8c6`; inspected read-only, final status comparison in the QA matrix.
- New repo: `/Users/vamshipendyala/Desktop/july28drchiag/Social24x7-web-app`.
- New starting HEAD: `d530bb32eabac8ccf367a13c7c2aa878101ece5a`; final SHA comes from the actual committed release.
- Database schema/RLS changes: **none**.
- Auth provider, Storage bucket, Realtime publication and Edge Function configuration changes: **none**.
- Authorized QA text sends/read updates are real application-data operations; they do not imply schema or account-role changes.
- Existing APK source/backend contract compatibility was preserved by reuse and absence of backend migrations. Installed-APK behavior was **not independently verified**.

## Supporting documents

- `WEB_PLATFORM_ARCHITECTURE.md`: routes, boundaries, identity and synchronization.
- `ACTUAL_SOCIAL24_ROLE_MATRIX.md`: actual roles, Auth settings and onboarding field mapping.
- `SHARED_SUPABASE_INTEGRATION.md`: commerce bindings and backend safety constraints.
- `CHAT_SYNC_IMPLEMENTATION.md`: message/attachment semantics and Business Work boundaries.
- `REAL_BACKEND_QA_MATRIX.md` and local screenshot flow index: exact completed checks, final SHA, deployment and remaining proof.

Client decisions should focus on a real Partner/agency model, E2EE requirements and AI implications, and payment/subscription/settlement policy; see `REMAINING_CLIENT_DECISIONS.md`. Email OTP is already recorded as the user's future preference, not a question blocking this delivery. Ordinary code organization and shared-backend synchronization do not require new business-policy decisions.
