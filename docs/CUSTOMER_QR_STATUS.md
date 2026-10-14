# Customer QR status

WEB serves the actual non-persistent Customer linking entry. It explicitly states that linking is unavailable and issues no QR. It does not expose Customer private routes based on an ordinary Partner login or local flag.

Existing old mobile profile-QR and Wallet scanners are not Auth device-linking scanners. Read-only reference audit is recorded in CUSTOMER_QR_PAIRING_ARCHITECTURE.md. No compatible challenge, mobile approval, one-use exchange or linked-device grant contract has been verified in the shared backend.

Required coordinated work: server-issued expiring challenge; authenticated APK Linked Devices scanner and explicit approval; short-lived browser-bound one-time exchange; replay/rate-limit protections; device registry, revoke/logout and isolation tests. Never put Supabase access/refresh tokens in QR or URL. APK changes require separate authorization; old source remains untouched.

Existing new-web account modules include Personal Chat, orders, Social feed, discovery, profiles, supported interactions and in-app notifications. They remain available through authorized Partner account routes. This is not evidence of a linked Customer session. Group Chat, dedicated consumer Shop/Wallet and full mobile parity are not claimed. Financial transfers, E2EE and new backend architecture remain outside this release.
