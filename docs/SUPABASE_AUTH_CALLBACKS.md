# Supabase Auth callbacks

Project: kcuxyxqtfkxrbtmugjsn. Code now accepts the verified Partner origin plus the existing Vercel regression origin; localhost is development-only. Registration begins on Partner before PKCE is created. It supplies emailRedirectTo with a fixed role segment, not a user-provided URL.

Required exact official allowlist additions (preserve all existing mobile/recovery entries):

- https://partner.social24-7.com/auth/callback/seller
- https://partner.social24-7.com/auth/callback/creator
- https://partner.social24-7.com/auth/callback/partner

Retain existing Vercel equivalents where already configured. Do not add broad wildcards or public/customer callbacks: those surfaces do not originate password signup. Do not change the shared Site URL blindly: mobile password recovery may depend on it.

## Configuration access blocker

The connected database connector exposes SQL/project tools, not Auth URL/template management. Browser attempts to open this project's URL Configuration in available signed-in dashboard profiles redirect to organizations without this project. Therefore actual Site URL, allowlist, confirmation template and mobile entries cannot be inspected or changed yet. No Auth settings changed. Do not claim the email redirect bug is fully repaired until the exact entries are verified in the correct dashboard account and a controlled-mailbox signup is tested.

Confirm-signup template should use the supported ConfirmationURL flow (per-request redirect), not a hardcoded old deployment or SiteURL-only link. Inspect before editing. Preserve email confirmation and existing password-reset templates/mobile callbacks. No mailbox was invented; real email-link QA remains blocked pending an authorized inbox.

## Session behavior

Supabase SDK handles PKCE URL exchange once. Callback waits for getSession and verifies getUser, then routes from authoritative backend role/status. It removes callback query/fragment from browser history and does not display raw provider errors. A different browser without the verifier gets a role-preserving sign-in continuation, not token forwarding. Existing Admin precedence remains.

References: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow). Tests are code-level proof, not a delivered-email acceptance test.
