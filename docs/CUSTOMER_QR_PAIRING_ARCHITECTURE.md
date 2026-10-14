# Customer QR pairing — design and exact blockers

## Current state

NOT IMPLEMENTED end to end. /web and /web/app/* show a clearly unavailable linking page. They issue no challenge, show no fake QR, simulate no expiry, and accept no local pairing flag. Partner authentication does not unlock this surface. The design below is a proposal requiring security review and an explicitly authorized APK update; no pairing schema/function has been deployed.

## Old app evidence

- app/profile-qr.tsx has expo-camera barcode scanning and image scanning. It interprets social24x7://profile/<id> and navigates to a Social profile.
- src/features/wallet/WalletScreen.tsx displays profile/account QR information for coin transfers.
- Existing Expo linking handles app navigation; it does not establish a browser Auth session.
- No compatible Linked Devices approval UI or secure pairing/session-exchange endpoint was found in the inspected mobile routes, source or deployed public RPC metadata.

Thus: scanner found YES; compatible login pairing NO; minimal APK update required YES.

## Why no frontend-only shortcut is safe

A challenge ID is not a Supabase Auth token. Putting a mobile refresh/access token in a QR, using service-role impersonation, sharing Partner localStorage, or inventing a JWT would violate account/session isolation. Existing password/PKCE signup does not provide an authenticated mobile-to-browser device-code grant automatically. Supabase OAuth server documents authorization-code PKCE and refresh-token grants, not a ready-made device-code grant. Selecting and validating a supported session exchange is a prerequisite, not an implementation detail to guess.

## Proposed architecture, not production implementation

Browser → narrow pairing service → authenticated mobile approval → session exchange → browser-owned session.

1. Trusted web origin creates a short-lived challenge and browser-held proof (cryptographic random secret / PKCE binding). Server stores only the verifier/hash, expiry, status and minimum browser context. Rate-limit creation.
2. QR contains a versioned HTTPS/deep link with an opaque challenge reference. No credentials, emails, Supabase tokens or service keys.
3. Updated APK recognizes the exact approved linking format/origin. Authenticated mobile requests the challenge details, shows origin/device/context and asks explicit approval. Scanning alone never approves.
4. Server validates mobile Auth, challenge ownership/binding, origin, expiry and state. Atomic compare-and-set permits exactly one approval/consumption; rejection/cancellation and replay are rejected.
5. Browser proves possession to a reviewed, supported Auth exchange. A fresh, independently revocable browser session is established, never a copy of the phone's refresh token.
6. Realtime can signal status, but must never broadcast session credentials. Authenticated/secret-bound polling fallback must enforce the same checks.
7. Browser renders /web/app only after server-backed linked-device validation. Use separate customer session storage/provider from Partner on the shared Vercel origin. Cross-domain storage is naturally separate, not automatically SSO.
8. Expose authorized devices, last use, revoke/unlink, logout and expiry. Revocation must invalidate actual Auth capability, not merely a UI flag.

## Minimum mobile change needing authorization

Add Linked Devices settings and an explicit Scan/Approve/Reject action; reuse camera permissions/scanning; distinguish pairing from profile and Wallet QR; show trusted browser origin and security confirmation; call the authenticated pairing service; list/revoke devices; handle offline, expired and replayed requests. Build and test an actual APK. This repository did not modify the APK.

## Server/schema review before implementation

Review a narrowly scoped table/RPC or Edge Function design with immutable expiry, hashed browser proof, atomic transition, strict user/member access, audit retention, rate limits and secret delivery controls. Choose a supported Auth exchange and threat-model stolen QR, attacker-operated origin, approval phishing, replay, concurrent consumers, cross-user grants, logout and session refresh. Do not apply a speculative migration before that review.

## Acceptance matrix

All genuine pairing cases remain BLOCKED: pending/expired/rejected/cancelled challenge; unauthenticated approval denied; wrong browser proof; single consumption; real session restored; revocation; mobile→browser approval; physical APK test. Current fail-closed UI and forged client flag rejection are tested, but are not QR authentication tests.

[Supabase supported OAuth flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows).
