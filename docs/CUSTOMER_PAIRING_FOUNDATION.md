# Customer pairing foundation — staged, NOT live login

2026-10-15. This supersedes QR-only Customer entry plans: existing-account
password login is independent and available at the Customer root/login routes.

## Delivered boundary

- A: production entry and honest disabled QR panel. No live or decorative QR.
- B/C: backend challenge generator, HTTP adapter, private SQL state and isolated
  tests. Migration **20261015080339_customer_pairing_foundation.sql is unapplied**.
  Edge `customer-pairing` is **not deployed**; index hard-disables creation.
- D/E: official mobile Linked Devices scanner + explicit approval UI absent.
- F: no reviewed mobile-authorized browser Auth exchange exists. No JWT minting,
  admin magic-link impersonation, refresh-token copying or local fake session.
- G: no compatible APK-to-web test yet. Original mobile repository unchanged.

Supabase supports authorization-code/PKCE and refresh-token OAuth flows; neither
alone is a phone-scan-to-browser session issuance contract. Choose and review a
supported provider-owned authorization flow (browser-bound PKCE authorization,
approved first-party client, proper redirect allowlist, consent and revocation)
with mobile/Auth owners before implementing F. The current code never claims
that consuming a pairing record creates an authenticated session.

## Security and compatibility review

No existing table, chat history, Storage policy, Auth user or retention changed.
New private table only; RLS enabled; no anon/authenticated grants on table or
functions. Service-only invoker RPCs use an empty search path. Browser and scan
proofs are separate 256-bit secrets, only SHA-256 hashes persisted. Device label
is untrusted display text. QR payload contains only random ID/scan proof in a
fragment, never browser proof, account identifiers, passwords or Auth tokens.

Two-minute expiry is enforced server-side. Row locks serialize approvals and
consumption. Cross-account redemption, duplicate approval, cancelled/expired
challenges and replay fail closed. Status reveals no approving identity.
Creation is bounded to five per hashed client/minute and 200 globally/minute;
pruning retains at most one day of ephemeral challenge metadata. A production
trusted-ingress HMAC rate-key derivation and endpoint-wide request throttling
are **not wired**; the HTTP adapter refuses creation without a rate key. No raw
IP or proof logging. Do not trust client-supplied forwarding headers.

The isolated SQL approve/consume operations require a trusted verified identity;
they are not HTTP endpoints. Future mobile adapter must call Auth `getUser`,
reject Work identities, require explicit confirmation and derive identity only
from that authenticated user. Browser-supplied user IDs must never be accepted.
There is deliberately no linked-device/revocation claim until real Auth session
ownership and revocation have been integrated.

## Activation and rollback

Production approval is separate from the earlier Team activation approval.
Do not run bulk `db push` while this migration is staged. Review D–F, trusted
rate key and callback configuration first. Apply only the reviewed exact change.
The web release does not need this schema to support ordinary account login.

Rollback: disable/remove only the new Edge adapter, then apply
`supabase/tests/customer-pairing-rollback.sql`. It removes the two new functions
and ephemeral private table; snapshot metadata first if audit evidence is needed.
No existing application data is touched. Rollback was tested locally.

## Verification

`src/test/customer-pairing.test.ts`: randomness, separate proof hashes, foreign
origin denial, disabled default, no forged approval/session route, rate-key
fail-closed, status/cancellation proof handling.
`supabase/tests/customer-pairing.cjs`: 26 synthetic local Postgres checks,
including actual privileges/RLS, expiry, terminal states, rate limit,
cross-account/replay denial and two simultaneous consumption transactions.

Sources checked: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
and https://supabase.com/docs/guides/auth/sessions (2026-10-15).
