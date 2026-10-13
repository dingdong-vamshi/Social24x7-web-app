# Architecture decision

## Decision

Social 24x7 Partner Web uses React, TypeScript, Vite, and React Router as a dedicated web application.

## Why not copy Expo React Native Web

The legacy Social 24x7 application is a mature Expo mobile product with many native and consumer dependencies: camera, contacts, location, calls, games, personal chat, wallet, and discovery. Copying the package graph would couple the new partner product to areas explicitly outside its scope.

Partner Web is desktop-first. Dense tables, filter bars, multi-column forms, finance ledgers, batch affordances, and role-scoped side navigation are cleaner as semantic web UI. Vite keeps the Phase 1 static frontend small and deployable on Vercel.

## What is reused

The implementation selectively preserves the legacy business concepts:

- Seller navigation hierarchy: orders, returns, catalog, logistics, affiliate, analytics, finance, team/verification, storefront, account health, and SEO/AI.
- Creator attribution model: promotion → tracking code → clicks → attributed order → commission.
- Creator category taxonomy and conditional professional verification.
- Product status, inventory, commission basis points, return evidence, seven-day settlements, and team activation states.
- Social 24x7 green/white brand direction and compact business information design.

Code is refactored into web-native components and framework-neutral TypeScript contracts rather than copied wholesale.

## Runtime boundaries

The browser talks only to repository interfaces. Phase 1 uses local adapters and fixture data. Phase 2 can inject Supabase repositories and secure server/Edge Function clients. Provider secrets and service-role credentials must never enter the Vite bundle.
