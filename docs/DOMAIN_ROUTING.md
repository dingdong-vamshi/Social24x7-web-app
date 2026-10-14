# Domain routing

src/lib/domains.ts owns host classification, route ownership, safe cross-origin links and Auth-origin checks. SurfaceLink maps public navigation, landing CTAs, branding, account-menu links and Customer entry. HostBoundary runs before AuthProvider/private routes mount. Supabase RLS/server authorization remain authoritative; hostname routing is not authorization.

Public paths stay on WWW. Partner/account/business-work paths on WWW move to Partner. Public information links from Partner return to WWW. Customer entry links open WEB. Partner Social remains on Partner with the same session. Root Partner resolves to /partner; WEB resolves to /web. Customer /account and legacy /web private paths fail closed at the unavailable linking page, not a reused Partner session. Explicit Partner links can still leave Customer for business registration.

Cross-origin redirects preserve only seller/creator intent and a restricted path-only next destination. No arbitrary query, Auth code, token, fragment or nested query is forwarded. Wrong-origin callbacks go to the correct role-specific sign-in without their credentials. Exact Partner callbacks stay on their initiating origin. Referrer-Policy: no-referrer prevents callback URLs leaking through navigation or subresources.

Vercel preview and local routes remain path-based. Apex 308 belongs to Vercel; no competing frontend redirect. Catch-all index.html rewrite retains nested-route refresh support. Domain tests cover deep links, callback isolation, preview compatibility and Customer fail-closed behavior.
