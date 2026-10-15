# Team operations — deployment and remaining acceptance

15 October 2026. Continue the existing video parity release; no redesign/restart.

## Implemented

| Gap | Implementation | Verification boundary |
| --- | --- | --- |
| Automatic invitation mail | Existing invitation create/resend RPCs plus authenticated `team-invitation-email`; automatic default when configured; explicit private delivery otherwise. Provider failure preserves the created invitation and never silently duplicates it. | Mocked provider/auth tests passed. No real email was sent; provider configuration missing. |
| Recorded historical totals | Separate distinct-conversation count across retained current/previous assignees, with earliest retained timestamp. Original current-assignment count remains visible. | Isolated count and access tests passed; no claim about unrecorded pre-audit assignments. |
| Supervisor rich content | Scoped server reader for attachments, canonical products, minimal order snapshots, legacy post captions, contacts, locations, polls and events. Media signed only after fresh user authorization, for 60 seconds. | Isolated authorization/path/expiry/deletion tests passed. Unsupported legacy payloads fail explicitly. No private media made public. |
| Employee product/order sharing | Company products and the conversation customer's orders; explicit confirmation; stable retry ID; canonical message with representative attribution; customer-visible cards. | Isolated authorization, cross-store/customer, permission revocation, suspended/resolved/reassigned and duplicate retry checks passed. No production customer message sent. |
| Employee return decisions | Current assigned, verified employee with existing returns permission can review, approve or reject canonical requests. Approval queues existing pending-external processing; no transfer API. | Isolated status, authorization, attribution and duplicate-decision tests passed. No production decision or money transfer. |

## Email configuration — exact operational dependency

The production dashboard shows custom SMTP **disabled**. Edge secrets have no invitation-email provider credentials; no email transport existed in the old activation-only function. Supabase Auth SMTP is not itself the custom Team invitation workflow.

Adapter provider: Resend. Configure `RESEND_API_KEY` (server secret), `TEAM_INVITE_FROM` (approved verified sender), optionally `TEAM_INVITE_REPLY_TO` in Supabase → Edge Functions → Secrets:
https://supabase.com/dashboard/project/kcuxyxqtfkxrbtmugjsn/functions/secrets

Use an organization-controlled sender on an **already verified** sending domain, e.g. `SOCIAL 24-7 Work <work@your-verified-domain>`. Do not use an unverified/social Gmail address as if it were a verified sender. No suitable sender/domain was established by this investigation. No GoDaddy changes are authorized. If no existing verified sender exists, the organization must supply/verify one outside this work scope before enabling delivery.

Resend currently offers a free tier with a 100/day sending limit; paid capacity is optional. Account choice, pricing and billing must be confirmed by the owner: https://resend.com/pricing . API: https://resend.com/docs/api-reference/emails/send-email . No account or paid plan was purchased.

Delivery acceptance: authorize one invitation to a controlled employee inbox, inspect provider **delivered/bounced** events and inbox/spam, then have that employee enter the one-time code and choose their private password. HTTP acceptance alone is not delivery. This test creates/replaces an invitation and therefore needs specific QA authorization.

## Work session — exact access dependency

The existing browser session is a Seller **owner** session. It is valid and continues to read Team/Seller data. It is not a Work identity. No current browser tab was an authenticated Business Work session.

Previously successful Work tests used temporary generated credentials. Their private files were subsequently deleted; retained exports contain redaction placeholders. The prior placeholder attempt is not evidence that a valid password stopped working. No password variants were tried in this run, no password/token fields queried, and no credential reset performed.

Existing active, activated, confirmed, non-banned QA logins:

- `qa.employeeb.b3c16b8789`
- `qa.employeeb.bc3511d860`

Both belong to Social24 Team QA and currently have only `business_chat_reply` and `business_feed_view`. Each has an assigned conversation. Neither currently has sharing, return-review or monitoring permission. The separate Social24 Test Store employee B is suspended; employee A is removed. They are not valid substitutes for an active login.

One exact login action: in the connected browser open https://partner.social24-7.com/business-login , sign out of the personal owner account **in that browser if prompted**, and sign in as `qa.employeeb.b3c16b8789` using its existing private Work password. Leave `/business-workspace` open and tell Codex it is ready. Do not paste a password/OTP into chat. If that password is not held privately, an owner-approved credential recovery/reset is a separate user action; there is no known usable credential to recover automatically.

## Remaining live acceptance — not a code-writing blocker

- Existing assigned inbox/read history/company-feed render and reconnect under Work identity: valid first QA login is enough, without writing business records.
- Reply and product/order share: requires explicit authorization to send to a controlled QA conversation. Sharing additionally requires narrow authorized permission grants; the current QA users do not have that permission.
- Return review: requires a controlled existing return, a narrow returns grant, and authorization for the exact decision. No payment transfer test is needed or allowed.
- Reassignment/revocation: both existing QA identities can be used; the second identity is needed to prove the new assignee succeeds while the old identity is denied. It is not needed merely to render Work. Explicit assignment/permission/status-change authorization is required; isolate first.
- Supervisor nonparticipant rich-media read: an owner can prove the owner path read-only now; a Work supervisor needs an authorized monitoring identity. Do not confuse owner proof with supervisor acceptance.

## Other independent limitations

- Retained audit begins 25 September for the examined QA stores. Earlier unrecorded assignments cannot be reconstructed honestly. Current assignment counts remain unchanged; recorded history is authoritative only for retained evidence.
- Actual refund settlement requires an external payment integration and business controls. The implemented workflow only queues pending processing. This is independent of employee login.
- Company feed remains read-only pending Dr. Chirag's choice: individual employee attribution, company attribution, or read-only. No policy invented.
- Backend activation approval was received and applied; it does **not** authorize production QA writes.

## Reproduce isolated verification

Use a fresh local PostgreSQL database and the guarded `/tmp/social-storage-policy-qa.*` socket on port 55439. Apply `closure-operations-fixture.sql`, `team-operations-support.sql`, then the new migration. Run `team-operations.cjs <socket> <closure_operations_database>`. Result: 49 checks. Existing `closure-operations.cjs` passed 47 separate checks. These selected catalog fixtures do not reproduce every production RLS policy, trigger, HTTP Auth or Storage pipeline.

Run `npm test`, `npm run build`, `npm run lint`, and `deno check` on both new Edge entrypoints. Result: 696 tests / 56 files; all checks passed. `qa/team-operations.html` is a local-only synthetic component preview, not a production entrypoint or an authentication bypass. Verified at 390px with no horizontal overflow.

Migration approval, exact checksum and rollback are in `TEAM_OPERATIONAL_PRODUCTION_APPROVAL.md`. Production screenshots and final deployment SHA/URL are supplied in the final task report; do not treat local synthetic screenshots as production proof.
