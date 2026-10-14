# SOCIAL 24-7 Web

The React + TypeScript + Vite application provides the public website and Seller/Creator Partner Web. Customer Web is now intended to reproduce the mobile consumer experience through secure QR device linking; that linking is not implemented yet. Existing authorized account Chats, Social and Orders remain available within the account experience. It reuses the existing SOCIAL 24-7 Supabase project and account model; it does not create a parallel identity or commerce backend.

This repository is separate from the mobile/APK application. The mobile repository is a read-only implementation reference and must not be changed or deployed as part of this project's release.

## Current surfaces

| Surface | Routes | Scope |
|---|---|---|
| Public | `/`, `/info/seller`, `/info/creator`, `/info/partners`, `/info/about` | Product information and account entry |
| Partner | `/partner`, `/partner/login`, `/partner/register`, `/partner/onboarding/:role` | Existing-account authentication and Seller/Creator applications |
| Seller Studio | `/partner/seller/*` | Approved Seller access; owned-store catalog, orders, returns, logistics, recorded finance, team visibility and promotions |
| Creator Center | `/partner/creator/*` | Approved Creator access; discovery, promotions, affiliate links, recorded earnings and profile |
| Own account | `/account/chats`, `/account/chat/:id`, `/account/orders`, `/account/social` | Existing authorized conversations, Social and orders; not QR-linked proof |
| Customer linking | `/web`, `/web/app/*` | Explicitly unavailable until secure server handoff and APK approval exist; no password form or fake QR |

Ownership-unverified target hostnames: `www.social24-7.com`, `partner.social24-7.com` and `web.social24-7.com`. Hostname-aware entry routing is implemented; custom DNS/domain bindings were not changed. Implemented pages are accessible by path on the existing Vercel URL; Customer pairing is not. Legacy sign-in, onboarding and workspace paths remain compatible.

## Live data, explicit limits

Production routes use Supabase Auth, existing authorized tables/RPCs and Realtime. They do not import fixture repositories or fall back to fictional data when a request fails. Historical mock modules remain isolated test/reference material, not a production mode.

- Authentication uses existing email/password and the registered-phone consistency check. Phone OTP and OAuth are unavailable in the current project configuration. New registration requires email confirmation; delivery/callback verification is tracked separately.
- Seller/Creator approval comes from backend capabilities, not a browser role picker. Drafts and private onboarding evidence use existing contracts; live submission/upload verification remains separately tracked.
- Existing product save/publish/media and Creator promotion APIs are integrated. Successful dashboard reads do not prove these writes; see the QA matrix for tested cases.
- Finance displays recorded data. This client does not execute payments, subscriptions, refunds, payouts, courier booking or new settlement rules. Business Work and team actions reuse existing contracts; read-tested pages do not establish that all employee/permission mutations have been live-tested.
- Messaging supports existing personal/group text conversations and authorized business-conversation views. Business ownership does not bypass assigned-worker reply restrictions. Existing browser attachments and group controls remain; the complete mobile super-app and native voice/push parity are not reproduced.
- Messages use the shared backend, not manual device-to-device copying. True E2EE and encrypted offline history are not implemented. Two-browser-client synchronization must not be described as installed-APK testing.
- The informational Partner page does not create an agency/Partner backend role.

Implementation, verification and deployment are different statuses. The [real-backend QA matrix](docs/REAL_BACKEND_QA_MATRIX.md) is the release evidence ledger; do not infer production readiness from this feature summary.

## Development

Use Node.js 22+ and npm in this repository:

```sh
npm ci
```

Create an ignored `.env.local` from `.env.example` with browser-public configuration:

```dotenv
VITE_SUPABASE_URL=https://kcuxyxqtfkxrbtmugjsn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

`VITE_SUPABASE_ANON_KEY` is supported as a legacy public-key alternative. The client refuses another project URL and privileged key formats. Never put service-role keys, database passwords, provider secrets or deployment tokens in `VITE_*` variables: these enter the browser bundle.

```sh
npm run dev -- --host 127.0.0.1
```

Use authorized existing test accounts through the approved credential channel. There is no production mock OTP. Do not commit passwords, tokens, private evidence or personal account details, or alter approval records just to make a test pass.

## Checks

```sh
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The build includes TypeScript and writes `dist/`. Vitest and Testing Library cover frontend/repository behavior with controlled responses; these do not independently certify production RLS, email delivery or live writes. Browser QA must additionally check deep-link refresh, account switching, validation, request failures, responsive layouts and authorized cross-client synchronization.

## Implementation boundaries

- `src/auth/`: real identity, capabilities, route guards and onboarding repositories/rules.
- `src/lib/supabase.ts`: shared browser client and configuration checks.
- `src/repositories/commerce.ts`: actual Seller/Creator data and supported existing RPCs.
- `src/features/chat/`: canonical messages, private media access and Realtime reconciliation.
- `src/pages/`, `src/components/`: presentation, forms and navigation.

No database schema, RLS, Auth-provider, Storage-bucket, Realtime-publication or Edge Function changes are included in this frontend integration.

## Documentation

The latest requirements and release limitations supersede historical scope descriptions:

- [New client web flow](docs/NEW_CLIENT_WEB_FLOW.md)
- [Seller/Creator Auth redirect and configuration blockers](docs/SELLER_CREATOR_AUTH_REDIRECT.md)
- [QR pairing architecture and APK dependencies](docs/CUSTOMER_QR_PAIRING_ARCHITECTURE.md)
- [35-area consumer parity inventory](docs/CUSTOMER_WEB_APK_PARITY.md)
- [Partner Social contracts and verification](docs/PARTNER_SOCIAL_MODULE.md)
- [Domain ownership and DNS checklist](docs/DOMAIN_AND_DNS_SETUP.md)
- [Current production QA](docs/PRODUCTION_QA.md)

- [Web platform architecture](docs/WEB_PLATFORM_ARCHITECTURE.md)
- [Actual roles and onboarding field mapping](docs/ACTUAL_SOCIAL24_ROLE_MATRIX.md)
- [Shared Supabase commerce integration](docs/SHARED_SUPABASE_INTEGRATION.md)
- [Chat synchronization implementation and limits](docs/CHAT_SYNC_IMPLEMENTATION.md)
- [TikTok reference audit and adaptation decisions](docs/TIKTOK_SHOP_REFERENCE_AUDIT.md)
- [Real-backend QA matrix](docs/REAL_BACKEND_QA_MATRIX.md)
- [Remaining client decisions](docs/REMAINING_CLIENT_DECISIONS.md)
- [Two-day handoff and release procedure](docs/TWO_DAY_HANDOFF.md)

Earlier `ARCHITECTURE.md`, `PLATFORM_ARCHITECTURE.md`, `FRONTEND_ARCHITECTURE.md`, `PHASE2_SUPABASE_INTEGRATION.md`, `FEATURE_SCOPE.md` and `CHAT_WEB_ARCHITECTURE_GAPS.md` describe historical Phase 1 planning. Their mock-only/future-integration statements are not the current runtime specification; use the connected-platform documents above.

## Deployment

Repository: [dingdong-vamshi/Social24x7-web-app](https://github.com/dingdong-vamshi/Social24x7-web-app), branch `main`.

Existing Vercel project: `social24x7-web-app`. Existing URL: [social24x7-web-app.vercel.app](https://social24x7-web-app.vercel.app/).

Deploy only this already-linked web project with `npm run build` and output `dist`. `vercel.json` supplies SPA rewrites. Verify `.vercel/project.json` before CLI deployment; never deploy the mobile project or create a replacement project. Final pushed SHA, served deployment and production QA belong in the QA matrix, not an assumed README status.
