# Frontend architecture

## Layers

- `src/domain`: framework-independent business types and creator verification policy.
- `src/repositories/contracts.ts`: interfaces consumed by product flows.
- `src/repositories/mock`: Phase 1 asynchronous mock implementations and browser-local state.
- `src/fixtures`: realistic QA records, kept outside components.
- `src/hooks`: repository loading helpers and UI state adaptation.
- `src/components`: shared shells, navigation, cards, tables, charts, and state UI.
- `src/pages`: route-level product surfaces.

## Route model

- `/`, `/login`, `/register`, `/onboarding`
- `/onboarding/seller`, `/onboarding/creator`, `/application`
- `/seller/*` for Seller Studio only
- `/creator/*` for Creator Center only

Seller and creator navigation arrays are distinct so seller-only tools never appear in Creator Center and creator-only tools never appear in Seller Studio.

## State model

Repository operations are asynchronous even when mocked. Screens include loading, empty, success, validation, and error components. Local onboarding progress and session fixtures use namespaced `localStorage` keys. This adapter can be removed when a live backend is available.

## Responsive model

At wide breakpoints the application uses a persistent left navigation, multi-column cards, dense tables, and chart grids. Below tablet widths the navigation becomes an accessible drawer. At 430 px, tables become labeled record cards and forms become single-column with sticky actions.

## Security model

Phase 1 performs no real authentication, storage upload, settlement, payment, or AI call. Future browser requests must use client-safe identity, RLS, signed uploads, and server-side secret mediation.
