# Social24 Partner Web

Social24 Partner Web is the dedicated desktop-first business application for Social24 sellers and creators. It combines onboarding with daily operational work: Seller Studio for commerce operations and Creator Center for affiliate commerce.

This repository is intentionally separate from the Social24 mobile application. It contains no consumer social feed, personal chat, games, wallet, nearby discovery, or consumer utility modules.

## Phase 1

The current application is a production-quality frontend foundation backed by typed mock repositories and browser-local fixture state. It does not connect to production Supabase, process money, send real OTPs, or upload documents.

- Partner landing, phone/OTP UI, and role selection
- Dedicated seller and creator onboarding
- Conditional professional creator verification
- Reusable application review and status experience
- Seller Studio: overview, catalog, orders, returns, logistics, finance, team, affiliate, analytics, account health, storefront, and SEO/AI shell
- Creator Center: overview, discovery, promotions, links, earnings, analytics, and profile
- Responsive layouts for desktop, tablet, and mobile

## Technology

- React + TypeScript
- Vite
- React Router
- Recharts
- Vitest + Testing Library
- Vercel static deployment with SPA rewrites

This lightweight web stack was chosen instead of copying the Expo app. The partner portal needs dense desktop workflows and does not need camera, contacts, calls, games, or other native/consumer dependencies. Domain contracts remain compatible with a future shared Supabase backend.

## Development

```bash
npm install
npm run dev
```

The local mock OTP is `246810`. This is intentionally isolated in the mock repository and is not production authentication.

## Checks

```bash
npm run build
npm run lint
npm test
```

## Data architecture

UI components depend on interfaces in `src/repositories/contracts.ts`. Phase 1 binds those interfaces to `src/repositories/mock`; Phase 2 will bind them to Supabase-backed implementations without changing screen contracts. Fixture records live in `src/fixtures`, outside UI components.

Only browser-safe variables are named in `.env.example`. Never place service-role keys, database passwords, provider secrets, SMTP credentials, or deployment tokens in browser configuration.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/PLATFORM_ARCHITECTURE.md`
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/PHASE2_SUPABASE_INTEGRATION.md`
- `docs/FEATURE_SCOPE.md`

## Deployment

The project builds to `dist/`. Vercel is configured to route deep links to `index.html`. The production custom domain `partner.social24-7.com` is deliberately not connected in Phase 1.
