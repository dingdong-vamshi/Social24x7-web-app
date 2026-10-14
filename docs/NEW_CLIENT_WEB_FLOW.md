# Client web flow — 14 October 2026

This update supersedes earlier three-option workspace selection and chat-only Customer Web assumptions. It does **not** claim full mobile parity or working QR authentication.

## Implemented route model

| Entry | Logged out | Authenticated |
|---|---|---|
| Seller navbar | /partner/register?role=seller; sign-in link retains role | Seller approval resolves onboarding, status or Studio |
| Creator navbar | /partner/register?role=creator; sign-in link retains role | Creator approval resolves onboarding, status or Center |
| Partner login, no role | Email + registered phone + password | Admin first; authorized remembered business workspace; approved Seller then Creator; otherwise existing application or Partner entry |
| Admin | Partner login with protected return | Verified Admin goes directly to /partner/admin |
| Customer | /web | Honest linking-unavailable page; a Partner session is not a paired browser |
| /web/app/* | Linking unavailable | Same fail-closed behavior until secure linking exists |
| Own account Social / chats / orders | Partner authentication | Existing authorized personal account only |

The old /onboarding selector now resolves the appropriate destination instead of showing three equal choices. /partner remains a voluntary Seller/Creator entry. Explicit intent overrides a remembered workspace; Admin login remains Admin. There are no new roles, accounts or approvals.

## Approval states

- not_applied: begin role onboarding.
- draft: resume existing application.
- more_information_required / rejected: reopen using the existing correction rules.
- submitted / under_review / suspended: show status, not an editable application.
- approved: enter the matching business workspace.

Seller and Creator are independent capabilities. Switching never grants the other role. Header actions change to Become, Continue, View Status, Update, or Switch based on backend access. Navigation is not authorization: existing RPC/RLS checks remain authoritative.

## Account, Work and Customer boundaries

Seller Social is the signed-in person's ordinary account, not the store owner's entitlement to other people's messages. Business Work identities remain excluded. Business Chat continues using existing business permissions. The separate QR Customer surface will need its own validated linked session; a local flag, a URL or a Partner session is not sufficient.

Existing own-account routes remain at /account/chats, /account/chat/:id, /account/orders and /account/social. Legacy /web/chats, /web/chat/:id and /web/orders preserve authenticated account access by redirecting to these routes. They are not QR proof.

## Onboarding safety

The actual current onboarding saves backend drafts on Save & continue, Save draft and backward step navigation; evidence upload writes immediately. No new account, evidence, application, approval or bank information was created in this pass. Already-approved QA accounts legitimately show approved status. Isolated component previews disable all backend traffic and never submit.

## Release limits

See SELLER_CREATOR_AUTH_REDIRECT.md for the remaining configuration/inbox acceptance blocker, CUSTOMER_QR_PAIRING_ARCHITECTURE.md for the missing session handoff/APK update, and CUSTOMER_WEB_APK_PARITY.md for the full module inventory. Official artwork is unchanged; CSS rounds icon corners and an SVG favicon clips the original bitmap.
