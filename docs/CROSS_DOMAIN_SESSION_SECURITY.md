# Cross-domain session security

WWW, PARTNER and WEB are distinct browser origins. Supabase localStorage sessions are not shared across them. No cross-origin cookie, postMessage bridge, query-token forwarding or service-role workaround was introduced. Same backend identity does not mean same browser session.

Partner registration/login/callback remain on Partner. URL-session detection is disabled outside the explicit Partner/Vercel/development origin allowlist. Cross-origin links/redirects discard sensitive query/fragment data; no-referrer headers prevent referrer disclosure. Partner Social shares its existing authenticated account, not employee business access. Business Chat/team checks are unchanged.

Customer private routes remain fail-closed pending a genuine linked-device grant. No QR exists to replay; replay prevention is BLOCKED, not PASS. Auth guards and canonical RPC/RLS continue to control actual roles and records. No schema/RLS changes were applied.

## Outstanding inherited security issue

Prior sprint found faulty generic shop-media INSERT/UPDATE/DELETE policies. See SPRINT_SELLER_FINDINGS.md and the private reviewed storage-repair evidence. A repair is prepared, not applied. This domain change does not fix that issue and must not be reported as an overall RLS/security PASS. Broad production readiness remains blocked on that reviewed backend repair and remaining acceptance tests.
