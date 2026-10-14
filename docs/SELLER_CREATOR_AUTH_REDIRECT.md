# Seller / Creator confirmation redirect

## Code implemented

Previously Auth.tsx sent emailRedirectTo = origin + /onboarding. This lost role intent and depended on the shared project's redirect configuration.

It now sends one exact, first-party callback:
- https://social24x7-web-app.vercel.app/auth/callback/seller
- https://social24x7-web-app.vercel.app/auth/callback/creator
- https://social24x7-web-app.vercel.app/auth/callback/partner

The role is a validated enum in the callback path, not an arbitrary next URL. Unknown origins are rejected. Local localhost/127.0.0.1 is allowed only in development. Custom domains are deliberately not signup origins yet; ownership and callback registration must happen first.

AuthCallback.tsx waits for supabase-js URL/PKCE initialization, validates the user with getUser, clears URL credentials, and resolves actual backend approval. It does not exchange the same one-time code twice. It does not force a second login when a valid session is available. Missing/expired/different-browser sessions get a role-preserving sign-in recovery path. Arbitrary external next URLs, encoded redirects and parent path traversal are rejected.

The existing SDK uses PKCE, persisted sessions and URL detection. Registered phone matching remains in the existing sign-in contract. SMS OTP has not been enabled.

## What was inspected vs what remains blocked

Confirmed project: kcuxyxqtfkxrbtmugjsn, ACTIVE_HEALTHY. Local public client configuration targets this project. Existing QA logins and data reads succeed.

The connected database tooling does not expose Auth URL/template configuration. Opening the exact project Auth settings in the available browser redirected to a different organization which lacks access to this project. Consequently:
- Actual current shared Site URL: NOT VERIFIED.
- Actual Additional Redirect URLs: NOT VERIFIED.
- Actual email template SiteURL/RedirectTo usage: NOT VERIFIED.
- Vercel secret/environment settings: not exported; runtime project verified through live requests.
- Seller/Creator email-delivery and confirmation acceptance: BLOCKED pending controlled inbox and correct dashboard access.
- No Auth configuration was changed.

Do not report the wrong-old-domain bug resolved end to end solely because the frontend callback exists.

## Required safe configuration review

1. Open the correct project > Authentication > URL Configuration with authorized access.
2. Record existing Site URL and every mobile/Expo/recovery redirect privately. Preserve them.
3. Add the three exact Vercel callbacks above without deleting existing destinations.
4. Review confirmation templates. Allowed per-request RedirectTo must not be replaced by a hardcoded old SiteURL. Follow Supabase's current template guidance, including ConfirmationURL/token handling. Do not expose email tokens.
5. Keep email confirmation enabled. Do not change phone/email providers or create bypass accounts.
6. Only after domain ownership and HTTPS validation, add the three matching Partner custom-domain callbacks and update confirmationUrl's explicit allowlist.
7. Test new Seller and Creator signups independently using controlled mailboxes. Confirm same-browser session restoration and status routing; test cross-browser recovery.
8. Retest existing mobile signup confirmation and password recovery. Code/config non-modification is not proof that email delivery still works.

## Evidence

Unit tests cover actual signUp callback options for both roles, session restoration, cross-browser recovery, no raw provider errors, invalid origins and status routing. Browser QA covers registration entry/link intent, recovery UI, existing approved accounts and logout. No email account was registered during this pass.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
