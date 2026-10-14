# Supabase Auth callbacks — 14 October 2026

Project: kcuxyxqtfkxrbtmugjsn. Correct dashboard access was restored. Four exact approved additions were saved and read back:

- https://partner.social24-7.com/auth/callback/seller
- https://partner.social24-7.com/auth/callback/creator
- https://partner.social24-7.com/auth/callback/partner
- https://partner.social24-7.com/auth/reset-password

Six entries now exist. The two legacy entries and shared Site URL remain unchanged. No mobile entries removed, no wildcard added, no DNS changed. Signup and reset template previews use ConfirmationURL; custom SMTP is not configured.

Fallback Vercel registration and forgot-password pages move to Partner before creating PKCE state. Existing fallback login remains available. Codes/tokens are never forwarded across origins. Localhost is development-only, not allowlisted in production.

Signup callback verifies the user and routes by authoritative roles/status. Recovery explicitly exchanges a recovery code with URL autodetection disabled on that route; an ordinary existing session is insufficient. Missing, expired, used, non-recovery and cross-browser links fail closed. Callback data is cleared from history. Work accounts retain their separate path.

Server policy: minimum eight characters, lowercase, uppercase, digits and symbols. Email confirmation remains enabled. Signup/reset match the policy; existing login does not reject old passwords locally. Work creation remains stricter at ten characters. No actual account password was changed. Paid leaked-password protection remains disabled.

## Evidence and limits

Private screenshots: /Users/vamshipendyala/Documents/Social24-7-Webapp2-2026-10-14/supabase-redirects.jpg and supabase-password-policy.jpg.

Real delivered-email signup/reset and real used-link acceptance remain BLOCKED: no approved private rotated credential/mailbox session was available. Default mail transport also needs controlled-inbox acceptance. Dashboard readback and unit tests are not email-delivery proof.

References: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Password security](https://supabase.com/docs/guides/auth/password-security).
