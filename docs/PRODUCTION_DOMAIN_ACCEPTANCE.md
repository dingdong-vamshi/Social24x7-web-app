# Production domain acceptance

2026-10-14. Baseline b0c251b9c2a2bd9763d2cf3c59916fa224391905; clean main before changes. No other active same-repository task appeared in the inspected thread inventory. Old mobile repository remains clean/read only. Official DNS/HTTPS and Vercel valid domain assignments verified. No DNS, Auth-provider, schema or RLS changes.

## Delivered

Central host/path routing and first-party navigation; Partner callback-origin support; safe role-intent preservation; no cross-origin callback credential forwarding; no-referrer headers; ordinary logout scoped to the current Auth session; accurate callback/application/page titles. Existing workspaces, Social, team, business chat and approval logic reused.

Implementation deployments: 3da3323 (domains) and 17e7076 (session-scoped logout) both reached Vercel success. The release's final code also includes page-title tests. Exact final SHA/deployment and bundle comparison are recorded in the handoff and private hostname evidence after deployment.

## Quality

- 389 tests / 38 files PASS; lint, TypeScript and build PASS.
- Build retains the non-blocking >500kB main-chunk warning.
- 112 production layout checks across 16 pages at 1440/1280/1024/768/430/390/360; no document overflow.
- Covered public home, both registration pages, Partner login, both approved status pages, both workspace overviews, account menu, Seller Social, notification panel, Team, Customer linking, Admin and products/Business Chat.
- Mobile public navigation and Admin navigation opened successfully at 390px. Fresh unapproved application forms are not included in that production layout claim.
- Application pages showed no major runtime failure. One unattributed browser console error involving an animation property appeared around direct SVG/favicon inspection; no application source URL was supplied. It did not recur during subsequent page navigation. Do not describe all captured console logs as empty.

## Actual production behavior

| Check | Result / limit |
| --- | --- |
| WWW homepage | PASS, official assets and correct cross-domain Seller/Creator/Customer links |
| Partner root | PASS, /partner landing |
| Customer root | PASS, /web unavailable-linking entry |
| Apex | PASS, HTTP 308 to https://www.social24-7.com/ |
| Vercel preview | PASS, existing path-based Creator registration and nested refresh |
| QA login | Naveen approved Creator direct login; Seller access and role switching PASS |
| Backend role checks | Naveen and Yogesh: approved Seller + Creator, not Admin. Admin: Admin capability, no Seller/Creator application |
| Admin | Actual normal login resolves to Admin even with Seller next path; overview and navigation PASS; no approvals performed |
| Non-admin | Naveen denied Admin page |
| Seller Social | PASS, Partner origin/session retained; sidebar below Business Chat |
| Notifications | Existing notification rows and zero unread count loaded; panel opens/closes. No new notification or unread transition manufactured |
| Team / Business Chat | Existing authorized views load; no invitation/assignment/reply mutation performed |
| Deep route | Seller products page survives actual browser refresh |
| Approved onboarding entry | Both go to actual approved status; not fresh application editors |
| Logout | Protected route returns to login; ordinary logout now uses scope local. No token bridge/device-wide logout added |
| Cross-origin sessions | Partner session does not appear on WWW/WEB. WEB /account/chats stays at unavailable linking entry |
| Private backend isolation | Read-only checks: Naveen denied Yogesh private team; cannot read message IDs from a Yogesh-only Personal conversation |
| Email confirmation | BLOCKED: correct dashboard project access + controlled mailbox required |
| Customer linked session | BLOCKED: no compatible APK + pairing backend; no fake QR |
| Overall RLS | NOT PASS: inherited generic shop-media policy vulnerability remains unrepaired |

## Screenshot evidence

Private durable directory: /Users/vamshipendyala/Documents/Social24-7-Official-Domains-2026-10-14/.

20 actual production browser captures. Numbered 01–18 omit 14 because a linked Customer session cannot be demonstrated; 15b adds the actual favicon, plus Admin mobile and non-admin denial captures. 02 shows Partner entry; Seller navigation is proven by 01→03 and its observed destination. 04/07 show real approved statuses, not new onboarding. 17 shows missing-session/cross-browser-safe sign-in continuation, NOT a clicked confirmation email. Social/Admin images are cropped to avoid unrelated content. No screenshot contains passwords/tokens/bank/KYC evidence.

## Remaining blockers

- Auth configuration permission: dashboard profiles available to automation cannot access this project's URL Configuration/templates. Exact proposed callback additions in SUPABASE_AUTH_CALLBACKS.md; all existing entries left unchanged.
- Controlled mailbox + eligible unapproved identity: needed for genuine signup/confirmation/fresh onboarding acceptance. Existing approved accounts were not downgraded.
- APK modification + backend contract: Linked Devices scanner, mobile consent, expiring one-use browser-bound exchange, rate limiting, unlink/replay acceptance.
- Shared Storage repair: prior reviewed proposal is still unapplied. No overall security PASS.
- Existing product limitations: no full Admin review-event history, no newly verified financial mutations, employee identity acceptance requires its own QA credentials. No automatic financial transfer or unconfirmed business model implemented.

No account creation, applications, approvals, KYC/bank uploads, orders, products, chat messages or financial writes in this domain integration pass. Normal Auth login/logout activity only.
