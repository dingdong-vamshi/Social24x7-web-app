# Domains and DNS — no changes performed

## Verified facts on 14 October 2026

- Exact GoDaddy-owned root domain: **NOT VERIFIED**. No authoritative receipt/account ownership evidence was available.
- Existing Vercel project: social24x7-web-app.
- Project ID: prj_KoHp74rBLTBRH8OWONTOpKQ8GGWQ.
- Project Domains page showed only social24x7-web-app.vercel.app, Valid Configuration, Production.
- No custom domains were attached. Consequently there are **no project-specific custom-domain DNS records to truthfully report yet**.
- GoDaddy changes: NONE. Vercel domain changes: NONE. Existing deployment retained.

Do not treat similar spellings, previous prose, DNS resolution or WHOIS as proof that the client owns a domain.

## Proposed names, conditional on ownership confirmation

If the owned domain is social24-7.com:
- Public: www.social24-7.com
- Partner: partner.social24-7.com
- Customer: web.social24-7.com

These are requested targets, not verified deployed hostnames. If ownership evidence gives another root, stop and revise consistently rather than guessing.

## Project-specific checklist for the developer

1. In the authorized GoDaddy account, confirm exact root spelling and ownership. Preserve current DNS and services; do not change nameservers.
2. In Vercel open the existing project:
   https://vercel.com/vamshi-krishna-pendyalas-projects/social24x7-web-app/settings/domains
3. Once ownership is confirmed, add only the approved hostnames to this existing project. Review any conflict with an existing project first.
4. Copy the exact Type / Name / Value / verification TXT values displayed by Vercel for each hostname. Do not copy a generic A-record IP or an assumed CNAME target from a tutorial.
5. User manually adds those records in GoDaddy. Preserve mail/MX/TXT and unrelated records. Record TTL and changes privately.
6. Wait for Vercel Valid Configuration and certificate provisioning. Verify HTTPS on each hostname before enabling login/registration.
7. Review root-to-www canonical redirect separately; do not repoint an existing root website without authorization.
8. Add exact Partner callback paths to the shared Supabase allowlist without removing mobile destinations; update the code's confirmationUrl allowlist. Unknown origins intentionally cannot register today.
9. Verify / root host routing, deep-route refresh, navbar destinations, account/logout isolation, callback origin and no redirect loop. The current code has anticipated partner/web root mapping for the proposed spelling only; cross-surface canonical links need production-host acceptance before launch.
10. Customer hostname remains unavailable for genuine QR authentication until its backend/APK dependencies pass acceptance.

Current usable route preview: https://social24x7-web-app.vercel.app/ with /partner and /web.

[Official Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
